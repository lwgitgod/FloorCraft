# Conventioneer — Executive Summary (Revised)

**Based on business research completed March 30, 2026**

---

## Who Is the Client

Vitaliy Mayzenberg is the founder of JOGS International Exhibits and the operator of the Tucson Expo Center. He has spent 20+ years building the JOGS Gem & Jewelry Show into one of North America's largest gem and jewelry trade events. He also controls a 155,000 sq ft venue in Tucson that hosts not only his own shows but a rotating calendar of third-party events — gun shows, quilt festivals, reptile expos, concerts, weddings, and quinceañeras.

He runs two intertwined businesses: a **show promotion company** and a **venue operation**. The software needs of each are different, and solving one without the other leaves half the problem on the table.

---

## What He Actually Does Today

### The Show Promotion Business (JOGS International Exhibits)

Vitaly promotes a circuit of gem and jewelry trade shows across the western U.S.:

| Show | Venue | Timing | He Owns the Venue? |
|---|---|---|---|
| JOGS Tucson Winter | Tucson Expo Center | Jan–Feb, ~12 days | **Yes** |
| JOGS Las Vegas | The Expo at World Market Center | Late May, ~5 days | No — he's a tenant |
| JOGS Tucson Fall | Tucson Expo Center | Sep, ~4 days | **Yes** |
| JOGS San Diego | San Diego Convention Center | Sep/Oct, ~4 days | No — he's a tenant (this show may be getting dropped) |

Each show involves the same core workflow:

1. **Recruit exhibitors** — 300–500 vendors per show, ~80% international from 26 countries. Outreach, applications, contracts, deposits.
2. **Build a floor plan** — Assign booths by type, pavilion, size, and pricing tier. Returning exhibitors expect their preferred spots.
3. **Sell tickets and register buyers** — Wholesale buyers register free with credential verification (tax ID, resale certificate). Retail guests pay $20–$35. Currently all through Eventbrite.
4. **Collect money** — Booth fees, deposits, installment payments, at-show service charges.
5. **Move his exhibitor pool to the next show** — The same vendors who do Tucson Winter get pitched for Las Vegas, then Tucson Fall. This cross-show selling is his core competitive advantage and it's done entirely by hand.

He also recently launched **ELEMENTS**, a show-within-a-show at Las Vegas targeting indie designers, online sellers, and boutique retailers — a different buyer persona than the traditional wholesale floor.

### The Venue Business (Tucson Expo Center)

At the Tucson Expo Center, Vitaly wears a completely different hat. He's the landlord. The venue hosts:

- His own JOGS shows (Winter and Fall)
- GunTV gun shows (5+ per year, run by a separate promoter)
- Quilt, Craft & Sewing Festival (run by Rusty Barn Promotion Group)
- Reptilian Nation Expo
- Seekers Summit (treasure hunting convention)
- Regional Mexican music concerts
- Weddings, quinceañeras, banquets, corporate events

For each of these, he provides the physical space, parking (1,000+ spots, free), and venue services — pipe & drape, tables, chairs, carpet, electrical distribution, loading docks, staging, AV. The venue is non-union, which is a competitive advantage on cost and flexibility.

He manages a venue calendar, avoids double-bookings, coordinates move-in/move-out gaps between events, and handles lease agreements with third-party promoters.

### The Critical Distinction: Owned Venue vs. Rented Venue

This is the single most important thing the software must get right.

**At Tucson (his venue):** Vitaly controls everything. He provides exhibitor services — electrical, furniture, booth construction, drayage, signage, cleaning. He manages the labor, the vendors, the logistics. This is where the "exhibitor services marketplace" concept from the original plan applies.

**At Las Vegas and San Diego (not his venues):** He controls nothing beyond his own show floor. The venue has its own contractors, its own rules, its own service ordering systems. In San Diego, teamsters deliver pallets — that's the convention center's operation, not his. In Las Vegas, World Market Center has its own infrastructure and AV. Vitaly's job at these venues is limited to: fill the floor plan with exhibitors, sell tickets, and manage his exhibitor relationships. He does NOT manage the electricians, the furniture, or the freight at these locations.

Any software that assumes he's the general contractor at every venue is wrong from day one.

---

## What's Broken Today

### Pain 1: The exhibitor Rolodex is a spreadsheet

His most valuable business asset — relationships with hundreds of international gem and jewelry vendors — lives in spreadsheets and email threads. There's no single system that shows: "This exhibitor has done Tucson Winter 3 years in a row, bought a 20x20 island booth each time, spent $15K in services, and hasn't confirmed for Las Vegas yet." Every cross-show sales conversation starts from scratch.

### Pain 2: Eventbrite is eating his margin

All ticketing runs through Eventbrite. At even $2–3 in fees per registration across 52,000+ visitors at the Tucson Winter show alone, plus Las Vegas and Tucson Fall — he's handing Eventbrite potentially $150K–$300K/year for a glorified registration form with zero integration into his exhibitor or booth management workflows.

### Pain 3: Booth sales are manual

Exhibitors can't browse an interactive floor plan and self-serve a booth reservation. Booth assignments, pricing, availability — it's all managed through back-and-forth communication. For a 500-vendor show, this is an enormous bottleneck. Returning exhibitors expect booth continuity across shows and there's no system tracking that history.

### Pain 4: Invoicing is fragmented

Booth fees, deposits, installment payments, service charges, sponsorships — all tracked separately, likely in spreadsheets or basic accounting tools. There's no consolidated exhibitor invoice that says "here's everything you owe for this show." Chasing payments from 400 international vendors via email is a full-time job.

### Pain 5: The venue calendar is uncoordinated

At Tucson Expo Center, he's juggling his own JOGS dates, GunTV's bimonthly schedule, quilt festivals, reptile shows, concerts, weddings, and private events — all in the same physical space with move-in/move-out buffers to manage. A scheduling conflict or a missed buffer means one event's teardown crashes into another event's setup.

### Pain 6: Exhibitor services are PDF-and-phone (Tucson only)

Only at his own Tucson venue does he manage exhibitor services (electrical, furniture, I&D, drayage, etc.). This is currently handled through what the industry calls an "Exhibitor Service Kit" — traditionally a packet of PDF order forms. Exhibitors fill them out, email or fax them back, and orders are manually compiled and dispatched to service vendors. It works, but it doesn't scale, and it's error-prone.

### Pain 7: No system carries knowledge across shows

When he clones a show for the next year or moves an exhibitor from Tucson to Las Vegas, everything starts over. There's no institutional memory in the tools. Booth preferences, service order history, payment reliability, communication history — none of it travels.

---

## What We Think He Needs

We're proposing a phased approach that starts with what hurts most and earns trust before expanding scope.

### Phase 1: The Core (Months 1–6)

**Exhibitor CRM + Multi-Show Pipeline** — One system to track every vendor relationship across all shows. Company profiles, contacts, booth history, payment history, show participation lifecycle, cross-show pipeline ("confirmed for Tucson Winter, pending for Las Vegas, declined San Diego"). Tagging and segmentation. The ability to pull a list that says "international amber exhibitors who've done 2+ shows and haven't confirmed for Las Vegas" and send them an offer.

**Replace Eventbrite** — Registration and ticketing under Vitaly's control. Wholesale buyer credential verification (tax ID, resale certificate, business license upload and review). QR badge generation. Multiple ticket types. On-site walk-up registration. No per-ticket fees to a third party.

**Invoicing and Payment Collection** — Consolidated per-exhibitor invoicing: booth fee + services + sponsorships = one invoice. Deposit and installment schedules. Stripe integration for card and ACH. Payment status tracking. PDF invoice generation. Stop chasing money via email.

### Phase 2: Floor Plan + Booth Sales (Months 4–9, overlapping)

**Interactive Floor Plan** — A visual, web-based floor plan per show. Exhibitors can browse, filter by pavilion/size/price, and reserve. Promoter can assign booths manually or let exhibitors self-serve. Booth status tracking (available, held, sold, blocked). Carry-over booth preferences from prior shows. This is high-complexity work (canvas rendering, spatial data) but high-impact for sales velocity.

### Phase 3: Venue Operations — Tucson Only (Months 6–12)

**Venue Calendar** — A booking calendar for the Tucson Expo Center that shows all events, manages space allocation across halls, enforces move-in/move-out buffers, and tracks leases with third-party promoters.

**Exhibitor Services Marketplace** — The online ordering system for electrical, furniture, I&D, drayage, signage, etc. This applies ONLY to shows at the Tucson Expo Center where Vitaly controls the services. At Vegas and San Diego, services are the venue's responsibility. The system needs a configurable service catalog per show, deadline-based pricing tiers, cart/checkout, and work order dispatch to vendors.

**Airtable Vendor Sync** — Vitaly has indicated that service vendors (electricians, assemblers) should work through Airtable. The pattern: exhibitor places order in Conventioneer → order syncs to vendor's Airtable base → vendor updates status in Airtable → status syncs back → exhibitor is notified.

### Phase 4: Growth Features (Months 12–18)

**Exhibitor Routing** — The ability to run cross-show campaigns: "These 100 exhibitors from Tucson Winter match the profile for Las Vegas — send them a personalized invite with one-click apply." This is the formalization of what Vitaly already does by hand, and it's what makes a multi-show operation scale.

**Show Cloning** — Clone last year's show to create next year's edition. Carry forward floor plan, booth types, pricing, service catalog, and pavilion structure. Optionally carry forward exhibitor assignments as "pending renewal."

**Franchise/Multi-Promoter Dashboard** — If and when Vitaly begins licensing the model to other promoters, the multi-tenant architecture supports it. But this is not a day-one requirement. Build the architecture to allow it; don't build the franchise UI until there's a franchisee.

---

## What We Are NOT Building (For Now)

- **A mobile app** — Not for MVP. Responsive web handles attendee needs.
- **A public website builder** — He has a WordPress site that works. Don't rebuild it.
- **A general contractor system for venues he doesn't own** — At Vegas and San Diego, services are the venue's problem.
- **A franchise onboarding system** — There are no franchisees yet. Build multi-tenancy into the architecture, but don't build the franchise UI.
- **Lead retrieval** — Exhibitors can use third-party badge scanners. Not a Phase 1 concern.
- **AI-powered exhibitor matching** — The routing engine is valuable, but simple filters and manual curation come first. Vector embeddings and ML matching are Phase 4 polish, not Phase 1 necessity.

---

## Why This Matters

Vitaly's competitive advantage isn't his software — it's his 20-year network of international exhibitors and his ability to move that network across shows and venues. Every hour his team spends manually tracking exhibitors in spreadsheets, chasing payments via email, or fielding booth assignment questions by phone is an hour they're not spending on the relationship work that actually grows the business.

The goal of Conventioneer isn't to be impressive software. It's to give Vitaly's team back their time, put his exhibitor relationships into a system that carries knowledge across shows and years, stop paying Eventbrite for something he should own, and make booth sales self-service so 400 vendors aren't all calling the same three people to ask what's available.

We prove value by solving the immediate pain — then earn the right to build the bigger vision.
