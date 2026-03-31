# Conventioneer Floor Plan — Frontend Demo Backlog

**Purpose:** Build a clickable, working frontend demo with hardcoded/mock data. No backend. No API. No database. All state lives in React. The goal is to show Vitaliy: "this is what your staff will use" — and it actually works on screen.

**Stack:** Next.js + react-konva + TypeScript
**Data:** Hardcoded mock data matching JOGS Tucson Winter (3 venues available, Tucson floor plan pre-loaded)
**Timeline:** Today → demo tomorrow

---

## Mock Data to Hardcode

Before building any UI, create a single `mockData.ts` file with:it

- **3 venues:** Tucson Expo Center (owned), World Market Center LV (rental), San Diego Convention Center (rental)
- **Tucson spaces:** East Hall, West Hall, North Hall, South Hall, Outdoor Bazaar
- **1 show:** JOGS Winter 2027 — uses East Hall + West Hall + Outdoor Bazaar
- **6 pavilions:** Amber, Southwest/Turquoise, International Gemstone, Silver Jewelry, Designer Jewelry, Outdoor Dealers — each with a hex color
- **~80–120 booths** pre-placed in a realistic grid layout across 3 halls, assigned to pavilions, mix of statuses (60% sold, 20% available, 10% held, 10% blocked), some with exhibitor names
- **Booth sizes:** mostly 10×10, some 10×20, a few 20×20 islands
- A placeholder background image (gray rectangle with hall outlines — we can sketch this or use a simple SVG)

This mock data IS the "database." Every component reads from it. Edits update it in React state.

---

## Backlog — Ordered by Build Sequence

### Ticket 0: create the "Empty Expo Hall"
Take the and create the "Empty Expo Hall" from 2026_floorPlan.png, i.e. Delete all the booth. Save that as EmptyTusconExpoHall.PNG

### Ticket 1: Project Scaffold + Konva Canvas Shell

**What:** Next.js app with  a single page. A full-screen Konva Stage inside a container. Zoom (scroll wheel) and pan (click-drag on empty space) working. A simple gray rectangle as the "venue background." Grid lines visible at zoom levels above 50%.

**Acceptance:** You can open the app, see a gray canvas, zoom in/out with scroll wheel, pan by dragging. Grid lines appear when zoomed in. The stage fills the browser window minus a top toolbar area.

**Why first:** Everything else renders on this canvas. Get it right.

---

### Ticket 2: Render Mock Booths as Colored Rectangles

**What:** Load the mock booth data. Render each booth as a Konva Rect on the canvas, positioned by x/y coordinates (in feet, scaled to canvas pixels). Color-code by pavilion. Show booth number as a Konva Text label centered inside each rectangle. Booths with status "blocked" get a diagonal hatch pattern or gray fill. Booths with status "held" get a dashed border.

**Acceptance:** Open the app, see ~100 colored rectangles arranged in a grid pattern that looks like a convention floor. Each booth shows its number. You can zoom in and read the numbers. Pavilion colors are visually distinct.

**Why second:** This is the "wow" moment. Vitaliy sees his floor plan on screen.

---

### Ticket 3: Booth Selection + Properties Panel

**What:** Click a booth → it gets a blue highlight border (selected state). A properties panel slides in from the right showing: booth number, dimensions (W × D), square footage, pavilion (colored badge), booth type, status, assigned exhibitor name (or "Available"), price, notes.

Click empty space → deselect. Click another booth → switch selection.

Shift+click → add to multi-selection. When multiple selected, the panel shows "N booths selected" with bulk fields: pavilion dropdown, status dropdown, booth type dropdown. Changing a bulk field updates all selected booths in state.

**Acceptance:** Click a booth, see its details on the right. Shift+click 3 booths, see "3 booths selected" with bulk options. Change pavilion in bulk → all 3 change color on the canvas.

---

### Ticket 4: Toolbar + Pavilion Legend

**What:** Top toolbar with: show name ("JOGS Winter 2027"), venue name, a pavilion legend showing colored squares with pavilion names. A view toggle: "Color by Pavilion" vs "Color by Status" (available=green, sold=red, held=yellow, blocked=gray).

Below the legend, show summary stats: "120 booths — 72 sold, 24 available, 12 held, 12 blocked"

**Acceptance:** Toolbar renders at top. Legend shows all pavilions with correct colors. Toggle between pavilion view and status view — booth colors change accordingly. Stats are accurate to mock data.

---

### Ticket 5: Drag to Reposition Booths

**What:** In edit mode (default), booths are draggable. Drag a booth → it moves with the cursor. On drop, it snaps to the nearest grid point (1-foot grid). If multiple booths are selected, dragging one moves all selected booths as a group, maintaining relative positions.

Show a subtle coordinate tooltip while dragging: "x: 42ft, y: 108ft"

**Acceptance:** Drag a single booth, it snaps to grid on release. Select 3 booths, drag one, all 3 move together. Coordinates show while dragging.

---

### Ticket 6: Resize Booths

**What:** When a booth is selected, show 4 small square handles at the corners. Drag a handle → resize the booth. Constrained to grid (minimum 8ft on any side, snaps to 1-foot increments). Width and depth update in the properties panel live as you drag. Square footage recalculates.

**Acceptance:** Select a 10×10 booth. Drag the right edge handle → booth becomes 10×15. Properties panel shows updated dimensions. Release → snaps to grid.

---

### Ticket 7: Add Row of Booths (Row Generator)

**What:** Toolbar button "Add Booth Row." Clicking it opens a small modal/popover:
- Number of booths (default 10)
- Booth width (default 10)
- Booth depth (default 10)
- Aisle gap after row (default 8)
- Number prefix (default "A")
- Starting number (default "01")
- Direction: horizontal / vertical

Click "Place Row" → cursor changes to crosshair. Click on canvas → row of booths appears at that position. They're auto-numbered (A01, A02, A03...) and unassigned (no pavilion, status=available).

**Acceptance:** Open the row generator, configure 8 booths at 10×10 with prefix "T". Click the canvas. 8 booths appear in a horizontal line, labeled T01–T08, colored as "unassigned." They're draggable and selectable like any other booth.

---

### Ticket 8: Add Single Booth

**What:** Toolbar button "Add Booth." Click canvas → a single 10×10 booth appears at that position. Auto-numbered based on the next available number. Immediately selected so the user can edit properties.

**Acceptance:** Click "Add Booth," click canvas, booth appears, properties panel opens for it.

---

### Ticket 9: Delete Booth(s)

**What:** Select one or more booths. Press Delete key or click "Delete" in the properties panel. If any selected booth has status "sold," show a confirmation dialog: "1 of 3 selected booths is sold. Delete anyway?" Otherwise delete immediately.

**Acceptance:** Select 2 available booths, hit Delete, they disappear. Select 1 sold booth, hit Delete, confirmation appears. Confirm → deleted. Cancel → nothing happens.

---

### Ticket 10: Right-Click Context Menu

**What:** Right-click a booth → context menu appears with: Edit Properties, Duplicate, Change Pavilion → (submenu with pavilion list), Set Status → (submenu: Available, Held, Sold, Blocked), Auto-Number Selection, Delete.

Right-click on empty canvas → context menu with: Add Booth Here, Add Booth Row Here, Paste (if booths were copied).

**Acceptance:** Right-click a booth, see the menu. Click "Change Pavilion → Amber" → booth changes to amber color. Right-click empty space, click "Add Booth Here" → booth appears at that spot.

---

### Ticket 11: Auto-Number Selected Booths

**What:** Select a row of booths (shift+click or rubber-band select). Right-click → "Auto-Number" or use the toolbar. A small modal: prefix, start number, direction (left-to-right or top-to-bottom based on booth positions). Preview showing the new numbers before applying.

**Acceptance:** Select 6 booths in a row. Auto-number with prefix "N" starting at 101. Preview shows N101–N106 mapped to booths left to right. Apply → booth labels update on canvas.

---

### Ticket 12: Search + Highlight

**What:** Search bar in the toolbar. Type an exhibitor name or booth number → matching booths get a bright highlight ring (pulsing or glowing border). Non-matching booths dim to 30% opacity. Canvas auto-pans to center on the first match. Clear search → everything returns to normal.

**Acceptance:** Type "Nativa" → one booth highlights, everything else dims, canvas scrolls to it. Type "A03" → booth A03 highlights. Clear → normal view.

---

### Ticket 13: Pavilion Filter

**What:** The pavilion legend items are clickable toggles. Click a pavilion → only that pavilion's booths are fully visible; all others dim to 20% opacity. Click again → toggle off (show all). Multiple pavilions can be active. "Show All" button resets.

**Acceptance:** Click "Amber" in legend → only amber booths are bright. Click "Silver Jewelry" too → amber + silver visible. Click "Show All" → everything visible.

---

### Ticket 14: Undo / Redo

**What:** Ctrl+Z = undo, Ctrl+Shift+Z = redo. Maintain a state history stack (last 20 states). Every action that modifies booth data (move, resize, add, delete, property change) pushes a snapshot. Undo/redo buttons also visible in toolbar with state (grayed out when nothing to undo/redo).

**Acceptance:** Move a booth. Ctrl+Z → it goes back. Ctrl+Shift+Z → it moves again. Add 3 booths, undo 3 times, all 3 disappear. Redo twice, 2 come back.

---

### Ticket 15: Clone Show Floor Plan

**What:** A "Clone From" button in the toolbar (or a modal accessible from show settings). Shows a dropdown of existing shows (mock: "JOGS Winter 2026", "JOGS Fall 2026"). Select one → all pavilions and booths are copied into the current canvas. Exhibitor assignments are cleared (all booths reset to "available"). A toast notification: "Cloned 120 booths from JOGS Winter 2026. All exhibitor assignments cleared."

For the demo, have a second mock dataset ("JOGS Winter 2026" with slightly different booth counts) to clone from.

**Acceptance:** Click Clone From → select JOGS Winter 2026 → canvas populates with booths. All are green (available). Pavilion assignments preserved. Booth count matches source.

---

### Ticket 16: Read-Only Viewer Mode

**What:** A toggle or separate route (`/viewer`) that shows the same canvas but with no editing capabilities. No drag, no resize, no right-click menu, no add buttons. Booths are clickable → show a detail popover (not the full editor panel) with: exhibitor name + logo placeholder, booth number, pavilion, size, products (mock text). Search and pavilion filter still work.

On narrow viewport (mobile width), the detail popover becomes a bottom sheet that slides up.

**Acceptance:** Switch to viewer mode. Click a booth → see exhibitor detail popover. Try to drag → nothing happens. Search works. Resize browser to phone width → popover becomes bottom sheet.

---

### Ticket 17: Export to PNG

**What:** Toolbar button "Export → PNG." Uses Konva's `stage.toDataURL()` to capture the current canvas view. Downloads as `JOGS-Winter-2027-floorplan.png`. Include the pavilion legend in the export (render it onto a temporary Konva layer before capturing).

**Acceptance:** Click Export PNG → a file downloads. Open it → shows the full floor plan with booth numbers and colors. Legend is visible in the image.

---

### Ticket 18: Visual Polish + Demo Readiness

Let me check the project knowledge and the uploaded Goldilocks file for context on the design direction.Here's the expanded Ticket 18, strictly in business-analyst language — no code, no classes, just what it should look and feel like:

---

## Ticket 18 (Expanded): Visual Polish + Demo Readiness

**Goal:** Make the demo feel like a product Vitaliy's staff would want to log into every morning — not something a developer threw together overnight.

---

### 18.1 — Color Palette: "Gem Show, Not Spreadsheet"

The pavilion colors are the heart of this floor plan. Random CSS colors will look like a test page. We need a curated palette that says "trade show floor" — rich, warm, gem-inspired tones that work when 120 rectangles sit next to each other.

**Pavilion color assignments:**

| Pavilion | Color Name | Hex | Why |
|---|---|---|---|
| Amber Pavilion | Warm Amber | `#D4890E` | Literally amber — rich honey gold |
| Southwest / Turquoise | Desert Turquoise | `#2B9EB3` | Iconic turquoise, not teal, not cyan |
| International Gemstone | Deep Amethyst | `#7B4DAA` | Jewel-tone purple, reads as "international luxury" |
| Silver Jewelry | Polished Silver | `#8C9BAA` | Cool blue-gray, metallic feel without looking disabled |
| Designer Jewelry | Rose Gold | `#C4727F` | Warm, elevated, distinctly "designer" |
| Outdoor Dealers | Sage Green | `#6B8F5E` | Earthy, outdoor, grounded — tent area feels different |

**Status colors (for status-view toggle):**

| Status | Color | Hex |
|---|---|---|
| Available | Soft Green | `#3EAE6A` |
| Sold | Rich Blue | `#2D6CCB` |
| Held | Warm Gold | `#E6A817` |
| Blocked | Muted Slate | `#8B8F96` |

Why blue for sold instead of red? Red says "problem." Sold is a good thing — blue reads as "locked in, done deal." The whole board should feel optimistic at 60% sold, not alarming.

---

### 18.2 — Surface & Background Treatment

The canvas shouldn't feel like a white void. It should feel like you're looking at an architectural plan on a desk.

- **Canvas background:** Very subtle warm off-white (`#F5F2EB`) — not pure white, not gray. Think: parchment-lite.
- **Hall outlines:** Thin, confident lines in a warm charcoal (`#3D3833`), not black. Slightly rounded corners on hall boundaries.
- **Aisle areas:** The negative space between booth rows should be a barely-there lighter shade (`#EDE9E1`), so aisles "read" without any explicit lines.
- **Grid lines** (visible on zoom): Very faint dotted lines in `#D6D1C8` — they guide without cluttering.
- **Drop shadow on the entire floor plan area:** A subtle 2–3px shadow so the floor plan "lifts" off the background. Makes it feel like a physical plan.

---

### 18.3 — Booth Rectangle Styling

Plain filled rectangles will look flat and lifeless. Small touches make them feel tangible:

- **Fill:** Pavilion color at ~85% opacity — slightly translucent so overlapping edges feel natural
- **Border:** 1px darker shade of the pavilion color (not black) — e.g., Amber booths get a `#B07008` border
- **Border radius:** Subtle 2px corners — booths shouldn't look like spreadsheet cells
- **Sold booths:** Solid fill, full confidence
- **Available booths:** Same pavilion color but lighter (40% opacity) with a dashed border — visually "open"
- **Held booths:** Pavilion color with diagonal stripe overlay (thin white stripes at 45°) — clearly "in process"
- **Blocked booths:** Solid slate gray with an "X" pattern — reads as "off limits" without needing a label
- **Hover state:** Slight brightness boost + gentle expand animation (scale to 102%) + cursor changes to pointer
- **Selected state:** Bright accent border (`#2563EB` — a clean UI blue) at 2px, plus a faint glow/shadow

---

### 18.4 — Typography That Scales

Booth numbers are the most important text on the entire canvas. They need to be readable from the zoomed-out "whole floor" view and the zoomed-in "I'm looking at one row" view.

- **Font:** System sans-serif (Inter if we're loading fonts, otherwise the OS default) — clean and technical, not decorative
- **Booth numbers:** Bold weight, centered in the rectangle, font size scales with zoom level
- **At zoomed-out (whole floor visible):** Only booth numbers show. No exhibitor names — they'd be unreadable noise.
- **At mid-zoom (one hall fills the screen):** Booth numbers prominent. Exhibitor names appear below in a lighter weight, smaller size, truncated with ellipsis if too long.
- **At full zoom (one row fills the screen):** Full exhibitor name, booth number, and a small status indicator icon. Text never overflows the rectangle — it truncates gracefully.
- **Color:** Dark text on light pavilion colors, white text on dark pavilion colors (auto-contrast based on fill brightness)

---

### 18.5 — Toolbar & Legend Polish

The toolbar and legend should look like they belong to a real SaaS product, not a developer console.

- **Toolbar background:** White with a subtle bottom border and barely-there shadow — it "floats" above the canvas
- **Show title** ("JOGS Winter 2027"): Left-aligned, bold, slightly larger. Venue name underneath in lighter gray.
- **Pavilion legend:** Horizontal row of colored chips — each is a rounded pill with the pavilion color as background and white or dark text (auto-contrast). Active/hovered legend items get a ring highlight.
- **Stats bar:** Below the legend. Clean, scannable: "**120** booths — **72** sold · **24** available · **12** held · **12** blocked" — each count uses its status color for emphasis.
- **View toggle:** A clean segmented control (not a raw dropdown), two options: "Pavilion View" | "Status View" — with a smooth color transition when switching.
- **Action buttons** (Add Booth, Add Row, Export, etc.): Clean icon + label buttons with consistent padding, subtle hover backgrounds. Primary actions (Add) in the accent blue, secondary actions (Export) in neutral gray.

---

### 18.6 — Properties Panel Polish

When you click a booth, the right panel should feel like a well-designed detail card, not a form dump.

- **Panel entrance:** Slides in from the right with a quick ease-out animati

---

## What's NOT in this Demo

- No backend / API / database — all state is in-memory React state
- No authentication or user accounts
- No venue setup / boundary tracing (we hardcode the venue layout)
- No background image upload (we use a pre-made SVG background)
- No auto-save or named versions (just in-memory undo)
- No PDF export (PNG only for demo)
- No real exhibitor data
- No booth sales flow (clicking "Reserve" in viewer does nothing)
- No mobile-native anything — just responsive web

---

## Build Priority if Time is Short

If we can't finish all 18 tickets, here's the minimum viable demo — the "show-stopper" set:

1. **Ticket 1** — Canvas with zoom/pan
2. **Ticket 2** — Booths rendered with colors and numbers
3. **Ticket 3** — Click to select, properties panel
4. **Ticket 4** — Toolbar + legend + status toggle
5. **Ticket 5** — Drag to reposition
6. **Ticket 7** — Row generator (this is the "aha" moment for staff workflow)
7. **Ticket 12** — Search + highlight
8. **Ticket 16** — Viewer mode (so he can see what exhibitors see)

Those 8 tickets tell the full story: "your staff lays out booths, your exhibitors browse the map."
