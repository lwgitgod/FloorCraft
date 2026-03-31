# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **planning and specification workspace** for **Conventioneer**, a convention management platform being designed for Vitaliy Mayzenberg / JOGS International Exhibits, LLC. There is no application code here — only markdown documents containing business analysis, engineering specs, discovery questions, and architectural plans.

## The Client and Business Context

Vitaliy Mayzenberg runs two intertwined businesses:
1. **JOGS International Exhibits** — a show promotion company running gem & jewelry trade shows (Tucson Winter, Tucson Fall, Las Vegas, possibly San Diego)
2. **Tucson Expo Center** — a 155,000 sq ft venue he owns/controls that hosts both his own shows and third-party events (gun shows, quilt festivals, reptile expos, concerts, etc.)

**Critical distinction:** At Tucson (owned venue), Vitaly controls everything including exhibitor services (electrical, furniture, booth construction, drayage). At Las Vegas and San Diego (rented venues), he only controls his show floor — the venue handles all services and logistics.

His long-term vision is to franchise the operational model so other promoters can run conventions using his system and exhibitor pool.

## What Conventioneer Will Be

An all-in-one convention management platform with five pillars:
1. **Ticketing & Attendee Registration** — replace Eventbrite
2. **Space & Floor Plan Management** — interactive drag-and-drop booth layout
3. **Exhibitor Services Marketplace** — online ordering for electrical, furniture, I&D, drayage (owned venues only)
4. **Exhibitor CRM & Lifecycle** — manage 400+ vendors across shows and years
5. **Franchise & Multi-Promoter Operations** — multi-tenant model with exhibitor routing between shows

**Planned tech stack:** Next.js (React) frontend, Python (FastAPI) backend, PostgreSQL, Turbopuffer, Airtable sync for vendor operations.

## Key Documents

| File | Purpose |
|---|---|
| `ES-revised.md` | Current executive summary (use this over `ES.md`) |
| `conventioneer-analysis.md` | Deep business analysis and market research |
| `conventioneer-engineering-plan.md` | Full engineering spec with 20 modules, domain model, and API surface |
| `conventioneer-floor-plan-SIMPLIFIED.md` | Reality-based floor plan spec (use this over the overengineered version) |
| `conventioneer-floor-plan-overenginered-spec.md` | Earlier, overly complex floor plan spec — kept for reference only |
| `FloorPlanningPains.md` | Business requirements spec for the floor plan module with venue details |
| `vitaliy-discovery-questions.md` | Guided discovery conversation script for client validation |
| `conventioneer-spec-v2-SOME JUNK.md` | Partial/draft spec — treat as unreliable |

## Working in This Repo

- When revising specs, prefer creating a new revised version (like `ES-revised.md`) or clearly marking the superseded document rather than silently overwriting.
- The simplified floor plan spec reflects a deliberate correction away from overengineering — booths are rectangles on a grid, not arbitrary polygons. Respect this design decision.
- The owned-vs-rented venue distinction affects almost every feature. Always consider whether a feature applies to both contexts or only owned venues.
- The engineering plan targets a team of 100 engineers with an October 2026 launch — scope and phasing decisions should be read in that context.
