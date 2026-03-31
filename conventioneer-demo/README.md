# Conventioneer Floor Plan Demo

Interactive convention floor plan editor for **JOGS International Exhibits**. Built as a clickable frontend demo with hardcoded mock data -- no backend, no API, no database. All state lives in React.

## Stack

- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Konva / react-konva** for canvas rendering
- **Jest** for unit tests
- **Playwright** for E2E tests (available but not yet wired)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm test` | Run Jest unit tests |
| `npm run lint` | Run Next.js linter |

## Project Structure

```
conventioneer-demo/
  src/
    app/
      layout.tsx          # Root layout (html/body)
      page.tsx            # Home page -- loads FloorPlanEditor
    components/
      FloorPlanEditor.tsx # Main editor component (canvas + toolbar + panels)
    data/
      mockData.ts         # Hardcoded venues, halls, pavilions, shows, ~100 booths
    types/
      index.ts            # TypeScript interfaces (Venue, Hall, Booth, Pavilion, Show)
    utils/
      boothColors.ts      # Color palette, status colors, auto-contrast utilities
    tests/
      ticket*.test.ts     # Per-ticket unit tests (tickets 0-18)
  public/                 # Static assets
  package.json
  tsconfig.json
  next.config.js
```

## What the Demo Shows

This is a **JOGS Winter 2027** floor plan at the Tucson Expo Center with:

- **3 halls**: East Hall, West Hall, Outdoor Bazaar
- **6 pavilions**: Amber, Southwest/Turquoise, International Gemstone, Silver Jewelry, Designer Jewelry, Outdoor Dealers
- **~100 booths** pre-placed in a grid layout, mix of sizes (10x10, 10x20, 20x20)
- **Status mix**: ~60% sold, 20% available, 10% held, 10% blocked

## Features (by Ticket)

| # | Feature | Status |
|---|---|---|
| 0 | Empty Expo Hall background | Done |
| 1 | Canvas shell -- zoom (scroll wheel) + pan (drag) + grid lines | Done |
| 2 | Render booths as colored rectangles with labels | Done |
| 3 | Click to select + properties panel (right side) | Done |
| 4 | Toolbar + pavilion legend + stats + color mode toggle | Done |
| 5 | Drag to reposition booths (snap to grid, group drag) | Done |
| 6 | Resize booths via corner handles | Done |
| 7 | Row generator -- add a row of booths at once | Done |
| 8 | Add single booth (click to place) | Done |
| 9 | Delete booths (with sold-booth confirmation) | Done |
| 10 | Right-click context menu | Done |
| 11 | Auto-number selected booths | Done |
| 12 | Search + highlight (exhibitor name or booth number) | Done |
| 13 | Pavilion filter (click legend to isolate) | Done |
| 14 | Undo / Redo (Ctrl+Z / Ctrl+Shift+Z, 20-state stack) | Done |
| 15 | Clone show floor plan from previous show | Done |
| 18 | Visual polish -- gem palette, light theme, booth styling | Done |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Scroll wheel | Zoom in/out |
| Click + drag (empty space) | Pan canvas |
| Click booth | Select |
| Shift + click | Multi-select |
| Delete | Delete selected booth(s) |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Escape | Clear search |
| Right-click | Context menu |

## Mock Data

All data is hardcoded in `src/data/mockData.ts`. There is no backend. Edits persist only in React state for the current session. Refreshing the page resets everything.

Two additional shows are available for the "Clone From" feature:
- JOGS Winter 2026 (fewer booths)
- JOGS Fall 2026 (more booths)

## Color Palette (Ticket 18)

**Pavilion colors** (gem-inspired):

| Pavilion | Color |
|---|---|
| Amber | `#D4890E` warm honey gold |
| Southwest/Turquoise | `#2B9EB3` desert turquoise |
| International Gemstone | `#7B4DAA` deep amethyst |
| Silver Jewelry | `#8C9BAA` polished silver |
| Designer Jewelry | `#C4727F` rose gold |
| Outdoor Dealers | `#6B8F5E` sage green |

**Status colors**: Available `#3EAE6A`, Sold `#2D6CCB` (blue -- sold is good!), Held `#E6A817`, Blocked `#8B8F96`

## Tests

```bash
# Run all tests
npm test

# Run a specific ticket's tests
npx jest src/tests/ticket18.test.ts --no-cache
```

## What's NOT in This Demo

- No backend / API / database
- No authentication or user accounts
- No venue setup / boundary tracing
- No background image upload
- No auto-save or named versions
- No PDF export (PNG export planned for Ticket 17)
- No real exhibitor data
- No booth sales flow
- No mobile-native features
