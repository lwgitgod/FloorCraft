# Conventioneer — Executive Summary

## The Problem

Vitaliy Mayzenberg runs JOGS International Exhibits, a 20+ year trade show promotion business operating at a scale most event software wasn't designed for: 155,000+ sq ft of indoor space, 400–500 exhibitors from 26 countries, 52,000+ visitors per show, across multiple cities and seasons. He doesn't just run one show — he runs a *platform for shows*, where exhibitors float between his own events, third-party promoters leasing his venue, and eventually franchisees operating under his system.

Today, his operation is stitched together with Eventbrite (ticketing), spreadsheets (exhibitor tracking), email (communications), and manual coordination (logistics). The enterprise software that exists in this space — Momentus, A2Z, ConventionSuite — costs $50K–$150K+ per year, still doesn't cover his full workflow, and none of them support the franchise/multi-promoter model that is central to his growth vision. He's paying potentially $80K per show name per year for tools that leave massive gaps.

## What We're Building

**Conventioneer** is an all-in-one convention management platform that covers the full lifecycle of a trade show — from the moment a promoter sketches a floor plan to the moment the last booth is torn down and the final invoice is settled. It's built around five business pillars:

**1. Ticketing & Attendee Registration** — Replace Eventbrite entirely. Sell tickets online, verify wholesale buyer credentials (tax IDs, resale certificates, business licenses), generate QR-coded badges, handle on-site walk-up registration and badge printing, and track attendance analytics. Multiple ticket types from free wholesale buyer passes to $35 retail guest tickets, with promo codes, group discounts, and multi-day passes.

**2. Space & Floor Plan Management** — Give promoters an interactive, drag-and-drop floor plan designer that handles multi-zone venues (indoor halls, outdoor bazaars, multiple pavilions). Exhibitors can browse available booths on a live map, filter by size/price/pavilion, and reserve directly. The system tracks booth history across shows so returning exhibitors can be offered their preferred spots. Priority point systems reward loyalty with earlier booth selection access.

**3. Exhibitor Services Marketplace** — This is the core differentiator, and the piece no competitor does well. Trade shows require a massive logistics operation: electrical hookups, furniture rental, booth construction (pipe & drape, hard walls), drayage (freight handling), signage, internet/AV, cleaning, security, catering. Today this is managed through PDF order forms and phone calls. Conventioneer turns it into an online marketplace where exhibitors browse a service catalog, add items to a cart, see pricing that adjusts based on advance-order deadlines vs. at-show surcharges, and check out. Orders are automatically grouped into work orders and dispatched to the appropriate service vendors.

**4. Exhibitor CRM & Lifecycle Management** — A complete relationship management system for exhibitors across shows and years. Company profiles, contact management, application and onboarding workflows, contract generation, invoicing, payment tracking, a self-service portal where exhibitors manage their profile, order services, view invoices, and track a pre-show checklist. The system tracks every exhibitor's journey from prospect to loyal repeat participant, with tagging, segmentation, and lifetime value tracking.

**5. Franchise & Multi-Promoter Operations** — This is what makes Conventioneer fundamentally novel. No existing platform models the reality that Vitaly operates: he's simultaneously a venue owner (or controller), a show promoter, an exhibitor broker who routes vendors between shows, and an aspiring franchisor. The platform supports multiple organizations (franchisees), each running their own shows with their own branding, while Vitaly maintains a master exhibitor pool, aggregate reporting across the entire network, and revenue share tracking. A franchisee in Dallas can request exhibitors from Vitaly's pool. Vitaly can see performance across all 15+ shows in one dashboard.

Sitting underneath all of this is the **Exhibitor Routing Engine** — Vitaly's secret weapon. He has relationships with hundreds of gem and jewelry exhibitors worldwide. The system uses smart matching to recommend which exhibitors would be a good fit for which shows, and lets promoters run routing campaigns: "You showed at JOGS Tucson Winter. My franchisee's new show in Dallas has open booths in your category. Want in?" This is essentially a B2B marketplace for convention exhibitors, and it's what makes the franchise model defensible.

## Who Uses It

The platform serves six distinct user types, each with their own interface:

- **Platform Owner (Vitaly)** sees everything: all shows, all promoters, all exhibitors, all revenue, the master exhibitor pool, and franchise management tools.
- **Promoters (Franchisees)** get a show-specific dashboard: their exhibitors, their floor plan, their service catalog, their finances, their staff.
- **Exhibitors** get a self-service portal: manage their profile, select booths on the interactive floor plan, order services, pay invoices, track a pre-show checklist, and capture leads during the show.
- **Service Vendors** (electricians, furniture rental companies, I&D crews, drayage operators) receive work orders through an Airtable integration that gives them a familiar spreadsheet-like interface they can customize, with status updates syncing back to the platform automatically.
- **Attendees/Buyers** interact through public show websites and a mobile app: register, buy tickets, get a digital badge, browse the exhibitor directory, navigate the floor plan, and receive personalized recommendations.
- **On-Site Staff** use kiosk and tablet interfaces for badge scanning, walk-up registration, badge printing, and real-time show floor management.

## Why This Matters Commercially

The trade show industry has a fragmented software landscape. Registration lives in one tool, floor plans in another, logistics are managed manually, and no one does franchise operations at all. Promoters at Vitaly's scale are paying over a million dollars a year across multiple vendors and still papering over gaps with spreadsheets.

Conventioneer consolidates all of this into one platform. The business model has multiple revenue layers: licensing fees from franchisees, potential per-show fees, platform transaction fees on payments processed through the system, and the network effect of a growing exhibitor pool that makes every new show in the network more valuable to every other show.

The addressable market isn't limited to gem and jewelry shows. The architecture is industry-agnostic. Any trade show vertical — home and garden, firearms, craft/quilting, food and beverage, industrial equipment — has the same operational needs. Vitaly's JOGS operation is the proving ground; the franchise model is the scaling mechanism.

## What We're Delivering

The platform consists of 20 modules spanning the full operation: platform core and authentication, venue management, show management, the interactive floor plan engine, exhibitor CRM, booth sales and reservations, ticketing and registration, the services marketplace, vendor operations with Airtable sync, exhibitor and promoter portals, franchise management, the routing engine, a financial engine with Stripe integration, communications (email, SMS, in-app, push), reporting and analytics, a mobile app for attendees and exhibitors, a public website builder with white-label support, on-site operations tools, and an integrations/API platform with webhooks.

The target is approximately 310 API endpoints, 65 database tables, and interfaces for every user type — from Vitaly's god-mode franchise dashboard down to an attendee scanning a QR code at the door.

## The Bottom Line

Conventioneer isn't just event management software. It's a platform that models the full complexity of how large-scale trade shows actually operate — the multi-venue reality, the exhibitor relationships that span shows and years, the logistics chain that turns an empty hall into a functioning marketplace, and the franchise economics that let this operational model scale beyond one promoter. Nothing on the market does this today. That's the opportunity.