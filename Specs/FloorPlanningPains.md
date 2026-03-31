
## Conventioneer Floor Plan Module — Business Requirements Spec

### The Physical Reality

**Venue 1: Tucson Expo Center** (owned) — 155,000 sq ft total. Four halls: East Hall (40,000 sq ft) and West Hall (40,000 sq ft) share an 80,000 sq ft open space with polished concrete floors and 35' ceilings. Maximum 500 booths at 10'×8' across East+West. South Hall is a carpeted 25,000 sq ft space. There are also ballrooms ranging from 1,000 to 26,000 sq ft, plus an outdoor lot and meeting rooms. For JOGS Winter, Vitaly uses *all of it* — every hall, outdoor tent bazaar, the works. For the Fall show or a third-party gun show, maybe just East+West.

**Venue 2: The Expo at World Market Center, Las Vegas** (rental) — South + North Halls total 193,858 sq ft with 970 booths at 10×10. South Hall is 96,350 sq ft (485 booths), North Hall is similar. Column-free exhibition space with advanced AV and lighting capabilities. JOGS likely rents one hall, not both.

**Venue 3: San Diego Convention Center** (rental) — 525,701 sq ft of contiguous exhibit space divisible into seven halls (A through H), plus a 90,000 sq ft Sails Pavilion. JOGS rents a subset — probably one or two halls for their growing show. Halls have varying column configurations: Halls A–C have groups of four columns, Halls D–H have single columns.

### What This Means for the Floor Plan Module

**The venue floor shape is the hard part, not the booths.** Booths are rectangles — always. They might be 10×8, 10×10, 10×20, or occasionally resized, but they're rectangles on a grid. The venue outline, however, can be anything: L-shaped halls, columns that eat into usable space, curved walls, loading docks that jut in, outdoor tent areas with irregular boundaries, columns placed in grids or clusters.

So the system needs to handle two very different problems:

**Problem 1 — Define the "playable area"** (the venue floor boundary where booths can go). This is an irregular polygon. It gets set up once per venue and tweaked per show. It changes rarely.

**Problem 2 — Place rectangular booths inside that boundary.** This happens every show. Booths get added, moved, resized, assigned to pavilions, sold to exhibitors. This is the daily workflow.

---

### Business Rules

**About venues:**

A venue is a physical location. It has one or more **spaces** (halls, outdoor areas, ballrooms). Each space has a boundary shape — the actual usable floor area. Spaces also have **obstructions** — columns, fire exits, loading dock doors, utility boxes, permanent fixtures — that reduce the usable area. A venue can be owned (Tucson) or rented. For rented venues, Vitaly only controls the spaces he's contracted for that show.

A venue gets set up once. Its boundary and obstructions change very rarely — maybe when a venue does a renovation or Vitaly discovers a column he forgot to map. The system should make venue setup straightforward but not something people do casually.

**About shows and floor plans:**

Each show gets its own floor plan. The floor plan starts from the venue's spaces but lives independently — because the same venue hosts different shows with completely different booth layouts. JOGS Winter uses all four Tucson halls. The Fall show might use just East+West. A gun show promoter renting from Vitaly might use only West Hall.

When Vitaly creates a new show, he picks which venue spaces to include. The system copies those space boundaries into the show's floor plan as the starting canvas. From there, he lays out booths.

**Cloning is critical.** JOGS Winter 2027 should start as a copy of JOGS Winter 2026's floor plan. Same booth grid, same pavilion assignments, same numbering. Then Vitaly adjusts — maybe he expands the Amber Pavilion, adds a row, removes a corner booth that had sightline problems. He should never start from scratch year over year.

**About booths:**

Every booth is a rectangle defined by width and depth (e.g., 10' × 8', 10' × 10', 10' × 20'). No triangles, no circles, no irregular shapes. A booth has a number (like E401), a type (inline, corner, end-cap, island, peninsula), and belongs to a pavilion. Booth pricing is driven by size, type, and pavilion — but that's outside this module.

Booths sit on a grid. The grid spacing is configurable per floor plan (typically 1-foot increments). Booths snap to the grid. Aisles are the negative space between booth rows — they're not drawn objects, they're just the gaps.

**Booth resizing happens but isn't frequent.** An exhibitor might ask to go from 10×10 to 10×20 (double their space). Or Vitaly might shrink a row of booths from 10' deep to 8' deep to squeeze in an extra aisle. The system should allow resizing individual booths or selecting a group and resizing them together. But this isn't a freeform drawing tool — it's always rectangles, always snapping to the grid.

**About pavilions:**

Pavilions are themed zones on the floor plan — "Amber Pavilion," "Southwest/Turquoise," "Indonesian Silver," etc. A pavilion is a grouping of booths, visually distinguished by color on the floor plan. Pavilions don't have hard geometric boundaries — they're just the collection of booths assigned to them. If you color all the Amber Pavilion booths orange, you'd see a roughly contiguous orange zone on the map. But a booth at the edge might get reassigned to a different pavilion between years.

---

### User Workflows (Who Does What)

**Vitaly / Show Manager — sets up the floor plan:**

1. Creates a new show, selects venue + spaces (or clones last year's show)
2. If new: sees the empty venue boundary. Starts laying out booth rows. Draws a row of 10 booths (10×10 each), positions it, numbers them. Repeats. Marks aisles by leaving gaps.
3. If cloned: sees last year's layout. Makes adjustments — adds/removes booths, moves a pavilion boundary, changes booth sizes in one section.
4. Assigns booths to pavilions (select a group → assign to "Amber Pavilion")
5. Marks some booths as "blocked" (not for sale — used for registration desk, lounge, food court, etc.)
6. Publishes the floor plan (makes it visible to exhibitors for selection)

**Exhibitor — views and selects:**

1. Opens the floor plan in read-only mode
2. Sees booths color-coded: available (green), sold (red), held (yellow), their own booth (blue)
3. Can filter by pavilion, booth size, booth type
4. Clicks an available booth → sees details (size, price, neighbors)
5. Reserves the booth (this feeds into the booth sales module, which is NOT part of this spec)

**Third-party promoter (gun show, quilt festival) — gets a simpler version:**

1. Vitaly gives them access to the venue spaces they've rented
2. They lay out their own booths within those spaces
3. They never see JOGS's floor plans or exhibitor data

---

### What the Floor Plan Screen Looks Like (Conceptually)

For the **admin/editor view**: A large canvas showing the venue boundary in the center. A toolbar on the side with tools: "Add Booth Row," "Add Single Booth," "Select," "Move," "Resize," "Assign Pavilion," "Set Booth Number." A properties panel on the right showing details of whatever's selected. Zoom/pan controls. A minimap in the corner for large venues.

The canvas shows:
- Venue boundary (gray outline — not editable here, comes from venue setup)
- Obstructions/columns (dark marks inside the boundary — not editable here)
- Booths (colored rectangles with booth numbers inside them)
- Aisles (the white space between booth rows)
- Pavilion colors (each booth tinted by its pavilion)

For the **exhibitor/public view**: Same map, but read-only. No editing tools. Booths are color-coded by status. Click a booth to get info. Search bar to find an exhibitor or booth number. Filter panel for pavilion/size/type.

---

### Key Operations the System Must Support

**Venue setup (rare):**
- Upload a background image (scanned floor plan PDF, CAD export, or photo) and scale it to real-world dimensions
- Trace the venue boundary over the image (draw a polygon)
- Mark obstructions (columns, doors, fixed elements) as small polygons or circles
- Save the venue template

**Floor plan editing (per show):**
- Clone from a previous show's floor plan
- Add a row of N booths with specified dimensions and starting booth number
- Add a single booth
- Select one or more booths → move them as a group
- Select one or more booths → resize (change width and/or depth)
- Select one or more booths → assign to a pavilion
- Select one or more booths → change booth type (inline, corner, island, etc.)
- Renumber booths (individually or auto-renumber a selected row/section)
- Delete booths
- Mark booths as blocked/unavailable
- Undo / redo (at least 20 steps)
- Auto-save
- Version snapshots (save a named version, revert to it later)
- Export to PDF (printable floor plan for exhibitors and production crew)

**Floor plan viewing (exhibitors and public):**
- Pan and zoom
- Color-coded by status or by pavilion (toggle)
- Click booth for details
- Search by exhibitor name or booth number
- Filter by pavilion, size, type, availability
- Works on mobile (responsive, touch-friendly zoom/pan)

---

### What Is NOT in This Module

- Booth pricing and sales transactions (that's the Booth Sales module)
- Exhibitor CRM and assignment (that's the Exhibitor module)
- Service ordering for booths (that's the Services module)
- Ticketing and attendee registration
- Anything about franchise/multi-tenant (the floor plan just respects org_id/show_id scoping)

The floor plan module exposes booth data to other modules. When a booth gets sold in the Booth Sales module, the floor plan reflects the status change. When an exhibitor is assigned in the CRM, the floor plan shows their name on the booth. But the floor plan module itself just manages the spatial layout and booth inventory.

---

### Edge Cases to Handle

**Column avoidance:** At San Diego Convention Center, columns are real and eat into booth placement. The system needs to let an admin mark a column zone and prevent booth placement overlapping it. Booths near columns might need to be smaller or offset.

**Outdoor/tent areas:** Tucson has an outdoor bazaar. The boundary is less precise — it might be a gravel lot with tent poles. The system should handle this the same way as an indoor space (define a boundary polygon), but maybe with a visual indicator that it's outdoor.

**Multi-hall shows:** JOGS Winter uses 4+ halls. Each hall is a separate space with its own boundary. The floor plan stitches them together. The admin should be able to view the whole show floor or zoom into a single hall.

**Non-rectangular venue boundaries:** The "playable area" in a real hall is rarely a perfect rectangle. There are jogs (no pun intended) for loading docks, offsets for lobbies, angled walls. The boundary polygon needs to support 20+ vertices, not just 4.

**Booth numbering conventions:** JOGS uses alphanumeric numbering (E401 = East hall, row 4, booth 01). Other promoters might use simple sequential numbers. The system should support configurable numbering patterns — prefix + row + sequence — and auto-numbering.

---

### Assumptions and Constraints

- Booths are always rectangles. No exceptions.
- The grid is the universal truth. Everything snaps to it.
- One floor plan per show. If a show uses multiple halls, they're all in one floor plan as separate "zones."
- The venue background image is a visual aid, not a data source. It's an underlay you trace over.
- The floor plan module does NOT do real-time multi-user editing in v1. One person edits at a time. (Locking is fine.)
- Export to CAD/DWG is a nice-to-have, not a must-have. PDF export is a must-have.
- Mobile editing is not required. Mobile viewing is required.