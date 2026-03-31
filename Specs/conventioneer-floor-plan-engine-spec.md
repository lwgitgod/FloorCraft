# Conventioneer Floor Plan Engine — Deep Dive Specification

**Module 4 | 10 Engineers | Weeks 1–21 (Foundation through Experience Build)**
**This is the highest-risk, highest-complexity module in the entire platform.**

---

## Table of Contents

1. [Why This Module Is Hard](#1-why-this-module-is-hard)
2. [The Two Applications](#2-the-two-applications)
3. [Technology Decision: Konva.js](#3-technology-decision-konvajs)
4. [Application A: Floor Plan Designer (Admin/Promoter)](#4-application-a-floor-plan-designer)
5. [Application B: Interactive Floor Plan Viewer (Public/Exhibitor)](#5-application-b-interactive-floor-plan-viewer)
6. [CAD Import Pipeline](#6-cad-import-pipeline)
7. [Spatial Data Model](#7-spatial-data-model)
8. [Real-Time Collaboration](#8-real-time-collaboration)
9. [Versioning & History](#9-versioning--history)
10. [Floor Plan Export](#10-floor-plan-export)
11. [Performance Budget](#11-performance-budget)
12. [Mobile Rendering Strategy](#12-mobile-rendering-strategy)
13. [Integration Points](#13-integration-points)
14. [State Management Architecture](#14-state-management-architecture)
15. [Booth Geometry & Spatial Rules](#15-booth-geometry--spatial-rules)
16. [UI/UX Specification: Designer](#16-uiux-specification-designer)
17. [UI/UX Specification: Viewer](#17-uiux-specification-viewer)
18. [API Endpoints](#18-api-endpoints)
19. [Testing Strategy](#19-testing-strategy)
20. [Build Phases & Milestones](#20-build-phases--milestones)
21. [Risks & Mitigations](#21-risks--mitigations)
22. [Open Source & Licensing Considerations](#22-open-source--licensing)

---

## 1. Why This Module Is Hard

The floor plan engine is not a "nice feature" — it is the **central nervous system** of the entire platform. Almost every other module reads from or writes to the floor plan:

| Module | Dependency on Floor Plan |
|---|---|
| Booth Sales (M6) | Exhibitor clicks a booth on the floor plan to reserve it |
| Exhibitor Portal (M10) | Exhibitor sees their booth location on the map |
| Service Ordering (M8) | Service orders reference a booth; vendors need to know where booths are physically |
| On-Site Ops (M19) | Check-in staff uses floor plan for wayfinding; issue tracking references booth locations |
| Mobile App (M17) | Attendees navigate the show floor using the interactive map |
| Public Website (M18) | Exhibitor directory links to booth location on the public floor plan |
| Reporting (M16) | Booth occupancy heat maps overlay on the floor plan |
| Promoter Dashboard (M11) | Sales pipeline visualization overlays sold/available status on the floor plan |

This means the floor plan has **two completely different applications** with different users, different interaction models, and different performance profiles — but they share the same underlying data.

### The Fundamental Complexity

A convention center floor plan is not like a simple seating chart or an office layout. Here's what makes it hard:

1. **Scale:** 155,000+ sq ft. 500+ booths. Outdoor areas. Multiple buildings. The canvas must handle thousands of shapes without lag.

2. **Irregular geometry:** Booths are not always rectangles. There are L-shaped booths, island booths (no back wall), peninsula booths (one open side), outdoor tent areas with non-standard shapes, and structural obstructions (columns, fire exits, loading docks) that create awkward spaces.

3. **Dimensional accuracy matters:** An exhibitor paying $5,000 for a 10×10 booth expects exactly 100 sq ft. The floor plan must maintain real-world dimensional integrity, not just "look right."

4. **It changes constantly:** Booths get added, removed, resized, merged, split, reassigned. The floor plan is a living document from the moment the show is announced until the last booth is dismantled.

5. **Multiple audiences:** The admin needs a precision design tool. The exhibitor needs a shopping interface. The attendee needs a wayfinding map. The vendor needs to know where booth E401 physically is so the electrician can run a cable to it.

6. **CAD interop:** Venue owners already have AutoCAD DWG/DXF floor plans. The system must import these, not ask users to redraw from scratch.

---

## 2. The Two Applications

### Application A: Floor Plan Designer

**Users:** Promoter admin, show floor manager
**Purpose:** Create and edit the booth layout for a show
**Interaction model:** Precision design tool (think simplified AutoCAD or Figma, not Google Maps)
**Runs on:** Desktop browser (minimum 1280×800 viewport). Not designed for mobile.

### Application B: Interactive Floor Plan Viewer

**Users:** Exhibitors (portal), attendees (public site + mobile app), vendors (Airtable-linked)
**Purpose:** Browse, search, filter, and interact with the floor plan
**Interaction model:** Interactive map (think Google Maps with custom overlays)
**Runs on:** Desktop browser, tablet, mobile phone

These are **separate React components** that share a common rendering layer and data model but have completely different toolbars, interaction handlers, and state management.

---

## 3. Technology Decision: Konva.js

### Why Konva.js over Fabric.js

| Criterion | Konva.js | Fabric.js |
|---|---|---|
| React integration | `react-konva` — first-class React bindings, declarative JSX | `fabric.js` is imperative; React wrappers exist but are community-maintained |
| Performance at scale | Multi-layer architecture (separate canvas per layer). Dirty-region rendering. Handles 10K+ shapes. | Single canvas. All objects on one surface. Degrades past ~2K objects. |
| Hit detection | Built-in hit graph (separate hidden canvas for pixel-perfect hit testing) | Built-in but slower on complex scenes |
| Mobile/touch | Built-in pinch-to-zoom, multi-touch. Designed for mobile from the start. | Usable but requires more manual configuration for touch |
| Serialization | `stage.toJSON()` / `Konva.Node.create(json)` — native serialize/deserialize of entire scene graph | `canvas.toJSON()` / `canvas.loadFromJSON()` — also good |
| Transform controls | Must be built manually (Transformer node exists but is basic) | Built-in selection, resize, rotate handles — more polished out of the box |
| TypeScript | Written in TypeScript natively | Has type definitions but JS-first |
| SVG export | No native SVG export (canvas-based) | Has SVG export |

**Decision: Konva.js** because:
- React-first architecture aligns with our Next.js stack
- Performance at 500+ booth shapes is critical (Konva's multi-layer approach wins)
- Mobile viewer needs excellent touch support (Konva is superior)
- We need to build custom transform UIs anyway (trade show booths have different resize semantics than general-purpose shapes)

**Trade-off accepted:** We lose Fabric's built-in transform handles and SVG export. We'll build custom transform controls and use server-side rendering (Puppeteer) for PDF/image export.

### Key Konva.js Architecture Concepts

```
Stage (the root container, maps to a <div> in the DOM)
  └── Layer (each layer is a separate <canvas> element)
       ├── Background Layer (venue image, grid, structural elements)
       ├── Booth Layer (all booth shapes — the main interactive layer)
       ├── Annotation Layer (labels, arrows, legends)
       ├── Selection Layer (selection rectangles, drag handles)
       └── Overlay Layer (tooltips, hover effects, search highlights)
```

Each layer is an independent `<canvas>`, which means:
- Drawing on the Booth Layer doesn't trigger a repaint of the Background Layer
- Mouse events can be isolated per layer
- Layers can be individually shown/hidden (e.g., hide annotations for a clean export)

---

## 4. Application A: Floor Plan Designer

### 4.1 Canvas Setup

**Coordinate system:**
- The canvas uses a real-world coordinate system in **feet** (configurable to meters)
- Origin (0,0) is the top-left corner of the venue's bounding box
- 1 unit = 1 foot
- The canvas viewport is a window into this coordinate space
- Zoom level determines how many feet are visible on screen
- Default zoom: fit entire venue floor plan on screen

**Grid:**
- Configurable grid: 1ft, 5ft, 10ft
- Grid renders as a repeating pattern on the Background Layer
- Grid visibility toggleable
- Snap-to-grid: when enabled, all shape operations snap to nearest grid intersection

**Background image:**
- Venue floor plan (imported from CAD or uploaded as image) renders on Background Layer
- Supports: PNG, JPG, SVG (from CAD conversion), or PDF (first page rasterized)
- User sets scale: "This distance on the image = X feet" (two-point calibration)
- User sets origin: click a known point on the image to align with coordinate system
- Background image is locked (cannot be accidentally moved)
- Opacity slider (dim the background when drawing booths over it)

### 4.2 Drawing Tools

**Tool palette** (left sidebar, vertical):

| Tool | Behavior | Keyboard Shortcut |
|---|---|---|
| **Select** (default) | Click to select shape. Click+drag on empty space to marquee-select. Click+drag on shape to move. | `V` |
| **Rectangle Booth** | Click+drag to draw a rectangular booth. Dimensions shown live during drag. Snap-to-grid applied. | `R` |
| **Polygon Booth** | Click to place vertices. Double-click or press Enter to close polygon. For L-shaped, T-shaped, irregular booths. | `P` |
| **Island Booth** | Click+drag to draw a rectangle that is automatically flagged as `island` type (no shared walls, accessible from all sides). | `I` |
| **Aisle** | Draw aisle paths (non-sellable space). Defined as a polyline with configurable width. | `A` |
| **Wall** | Draw structural walls/barriers. Solid lines that booths cannot overlap. | `W` |
| **Column** | Place a column (circle) at a point. Booths cannot overlap columns. | `C` |
| **Annotation: Text** | Click to place text label. Edit text inline. Font size in real-world units (so it scales with zoom). | `T` |
| **Annotation: Arrow** | Click start, click end. Arrowhead at end. For directional signage. | |
| **Annotation: Icon** | Place preset icons: fire_exit, restroom, food_court, registration, elevator, loading_dock, first_aid, info_desk | |
| **Measure** | Click two points to see distance in feet. Non-persistent (disappears on next click). | `M` |
| **Pan** | Click+drag to pan the viewport. Also available via middle-mouse-button or two-finger drag at any time. | `Space` (hold) |
| **Zoom** | Scroll wheel = zoom in/out centered on cursor. Also: `+`/`-` keys, zoom slider in toolbar. | `Ctrl+scroll` |

### 4.3 Booth Properties Inspector

**Right sidebar** — appears when a booth is selected:

| Property | Type | Notes |
|---|---|---|
| **Booth Number** | Text | Required. Must be unique within the floor plan. Auto-suggested (e.g., "A101", "A102"). |
| **Booth Type** | Dropdown | inline, corner, island, peninsula, end_cap, outdoor, custom |
| **Pavilion** | Dropdown | From show's pavilion list (Module 3). Determines booth fill color. |
| **Dimensions** | Read-only | Width × Depth in feet. Auto-calculated from shape geometry. |
| **Square Footage** | Read-only | Auto-calculated from shape area. |
| **Frontage** | Number | The "open side" length in feet (how much aisle-facing exposure the booth has). |
| **Pricing Tier** | Dropdown | standard, premium, super_premium, economy. Maps to pricing rules in Module 6. |
| **Base Price** | Currency | Auto-populated from pricing tier × sq ft, but can be manually overridden. |
| **Corner Premium** | Currency | Additional charge for corner booths (two open sides). |
| **Status** | Dropdown | available, reserved, held, sold, blocked, not_for_sale |
| **Assigned Exhibitor** | Search/select | If sold, link to exhibitor record. Shows exhibitor name on the booth. |
| **Neighboring Booths** | Read-only | Auto-detected: booths that share an edge. Useful for exhibitor placement. |
| **Utility Access** | Multi-select | nearby_electrical_panel, floor_outlet, water_access, internet_drop, rigging_point |
| **Notes** | Text area | Free-form notes (e.g., "Column partially obstructs back wall"). |
| **Custom Fields** | Dynamic | Per-show custom fields defined in Module 3. |

### 4.4 Multi-Select & Bulk Operations

- **Shift+click:** Add to selection
- **Ctrl+click:** Toggle selection
- **Marquee select:** Click+drag on empty space draws a selection rectangle
- **Select All:** Ctrl+A (selects all booths, not structural elements)
- **Bulk operations** (available when 2+ booths selected):
  - Assign pavilion
  - Set booth type
  - Set pricing tier
  - Set status (e.g., bulk-block a row of booths for renovation)
  - Align (left, right, top, bottom, center, distribute evenly)
  - Set uniform spacing (e.g., "3ft between all selected booths")
  - Delete

### 4.5 Booth Manipulation

**Move:**
- Click+drag a selected booth
- Arrow keys: nudge 1 grid unit (Shift+arrow = 1/10 grid unit for fine positioning)
- Enter exact position: type X,Y coordinates in the inspector
- Collision detection: warn if booth overlaps another booth or structural element

**Resize:**
- Drag edge handles to resize
- Maintains rectangular shape (for rectangular booths) unless a corner is dragged
- Dimensional constraints: minimum booth size (e.g., 6×6 ft), maximum booth size
- Live dimension readout during resize
- Shift+drag: maintain aspect ratio
- Enter exact dimensions: type Width × Depth in the inspector

**Duplicate:**
- Ctrl+D: duplicate selected booth(s), offset by 1 grid unit
- Useful for creating rows of identical booths

**Rotate:**
- Rotation handle (circular handle at top of selected booth)
- Snap to 0°, 45°, 90°, 135°, 180° (Shift held = snap to 15° increments)
- Most booths are axis-aligned; rotation is mainly for irregular layouts

**Split:**
- Select a booth → right-click → "Split Horizontally" or "Split Vertically"
- Divides one booth into two equal booths with auto-incremented booth numbers

**Merge:**
- Select two adjacent booths → right-click → "Merge"
- Combines into one booth. Booth number = lower of the two. Geometry = union of shapes.

**Delete:**
- Delete key or Backspace
- Confirmation dialog if booth has status other than "available" (to prevent accidental deletion of sold booths)

### 4.6 Smart Features

**Auto-Number:**
- Select a row of booths → right-click → "Auto-Number"
- Configure: start number, prefix (e.g., "A"), direction (left-to-right, top-to-bottom), increment
- Preview numbering before applying

**Row Generator:**
- Instead of drawing booths one by one, define a row:
  - Start point, direction, booth width, booth depth, number of booths, aisle width
  - System generates all booths in a row with sequential numbering
- "Generate Grid" variant: specify rows × columns → fills a rectangular area

**Booth Template Library:**
- Save a booth configuration as a template (size, type, included services)
- Templates: "Standard 10×10 Inline", "20×20 Island", "10×20 Corner", etc.
- Click template in library → click on canvas to place
- Org-level templates (shared across all shows)

**Neighbor Detection:**
- Automatic: system detects which booths share an edge (within 0.5ft tolerance)
- Used for:
  - Showing neighboring exhibitors in the portal
  - Enforcing rules (e.g., "competing exhibitors cannot be adjacent")
  - Calculating corner status (booth with 2+ aisle-facing sides = corner)

**Aisle Validation:**
- Aisles must meet minimum width (typically 8ft for main aisles, 6ft for cross aisles)
- Fire code compliance: minimum clear path between any booth and fire exit
- System highlights violations in red

### 4.7 Layers & Visibility

| Layer | Contents | Editable? | Toggleable? |
|---|---|---|---|
| Background | Venue image, structural walls | Scale/position only | Yes (dim/hide) |
| Grid | Grid lines | No (auto-generated) | Yes |
| Structural | Columns, fixed walls, fire exits, loading docks | Yes | Yes |
| Aisles | Aisle paths with width | Yes | Yes |
| Booths | All booth shapes | Yes | Yes (but why would you?) |
| Labels | Booth numbers, pavilion names | Auto-generated from booth data | Yes |
| Annotations | Text, arrows, icons | Yes | Yes |
| Status Overlay | Color fill based on booth status (green=available, blue=sold, yellow=held, red=blocked) | Auto-generated | Yes |
| Pavilion Overlay | Color fill based on pavilion assignment | Auto-generated | Yes |

### 4.8 Undo/Redo

- **Command pattern:** Every user action (draw, move, resize, delete, property change) is recorded as a command object
- Each command has `execute()` and `undo()` methods
- Undo stack: 100 actions deep
- Redo stack: cleared when a new action is performed after an undo
- Keyboard: Ctrl+Z (undo), Ctrl+Shift+Z (redo)
- Toolbar buttons: undo/redo with action description tooltip ("Undo: Move booth A101")

**Command types:**
```typescript
interface FloorPlanCommand {
  id: string;
  type: 'create_booth' | 'delete_booth' | 'move_booth' | 'resize_booth' |
        'update_property' | 'create_aisle' | 'bulk_assign' | 'merge' | 'split' |
        'create_annotation' | 'delete_annotation' | 'import_background';
  timestamp: number;
  userId: string;
  data: {
    before: any;  // state before action (for undo)
    after: any;   // state after action (for redo)
  };
}
```

### 4.9 Auto-Save & Conflict Resolution

- Canvas state auto-saves every **30 seconds** (debounced — resets timer on each edit)
- Save = POST the full canvas scene graph (Konva JSON) + booth metadata to the API
- If two admins edit simultaneously (real-time collab, Module section 8), changes are merged via operational transform on the scene graph
- If merge conflict (two users edit the same booth simultaneously): last-write-wins with notification to both users
- Manual save button also available (Ctrl+S)

---

## 5. Application B: Interactive Floor Plan Viewer

### 5.1 Rendering

- Same Konva.js canvas, but with a **read-only** interaction model
- No drawing tools, no property inspector
- Layers: Background, Structural, Booths, Labels, Overlay (no annotation editing layer)

### 5.2 Color Coding

**Exhibitor/attendee view — default coloring:**

| Booth Status | Fill Color | Border | Label |
|---|---|---|---|
| Available | White / light gray | Dashed gray | Booth number |
| Sold (exhibitor assigned) | Pavilion color (solid) | Solid dark | Exhibitor name + booth number |
| Reserved/Held | Pavilion color (hatched/striped) | Solid | "Reserved" + booth number |
| Blocked/Not for sale | Dark gray | None | — |

**Promoter view — sales overlay:**

| Booth Status | Fill Color |
|---|---|
| Available | Green |
| Held (15-min timer active) | Yellow |
| Reserved (awaiting payment) | Orange |
| Sold (paid) | Blue |
| Blocked | Red |

### 5.3 Interaction

**Hover:**
- Booth highlights (brighten fill, thicken border)
- Tooltip appears: booth number, exhibitor name (if assigned), size, price (if available), product categories

**Click:**
- Booth detail panel slides in from the right:
  - If sold: exhibitor name, company logo, product description, product images, "View Profile" link
  - If available: booth size, price, type, "Reserve This Booth" CTA button (links to Module 6 booking flow)
  - If held: "This booth is currently being held by another exhibitor"

**Search:**
- Search bar at top: type exhibitor name → matching booth(s) highlight with a pulsing animation + map auto-pans/zooms to center on the result
- If multiple matches: list panel shows all matches, click one to navigate

**Filter:**
- Filter panel (collapsible sidebar or dropdown):
  - By pavilion (checkboxes with pavilion color swatches)
  - By product category
  - By country (for international shows)
  - By availability (show only available booths)
  - By price range (slider)
- Filters dim or hide non-matching booths (configurable: dim to 20% opacity vs. fully hide)

**Zoom & Pan:**
- Scroll wheel = zoom (centered on cursor position)
- Pinch-to-zoom on touch devices
- Click+drag (or two-finger drag on touch) = pan
- Zoom controls: +/- buttons, "Fit to screen" button, "Zoom to pavilion" dropdown
- Minimap in corner (shows full floor plan with viewport rectangle; click minimap to jump)

**Wayfinding (mobile-oriented):**
- "My Booth" button (for logged-in exhibitors): auto-navigates to their assigned booth
- "Navigate to" feature: exhibitor A wants to walk to exhibitor B → show a suggested path following aisles (A* pathfinding on the aisle graph)
- "Nearby" feature: "Show me what's near my current location" (requires mobile GPS or BLE beacon integration — Phase 3)

### 5.4 Minimap

- Fixed 200×150px panel in the bottom-right corner
- Shows the entire floor plan at thumbnail scale
- Blue rectangle = current viewport
- Click anywhere on minimap to jump to that area
- Drag the viewport rectangle to pan
- Minimizable (click to collapse to an icon)

---

## 6. CAD Import Pipeline

### The Problem

Venue owners have existing floor plans in AutoCAD DWG format. We need to import these as the background layer. But DWG is a proprietary binary format, and `ezdxf` (our Python library) only handles DXF, not DWG.

### The Pipeline

```
Step 1: DWG → DXF conversion (if needed)
  Tool: ODA File Converter (Open Design Alliance — free CLI tool)
  Runs: Server-side as a subprocess
  Note: ODA converter must be installed on the server (it's a compiled binary, available for Linux)
  Fallback: User converts to DXF themselves before upload; we document this.

Step 2: DXF → Parsed geometry
  Tool: ezdxf (Python library)
  Process:
    - Load DXF file: doc = ezdxf.readfile(path)
    - Extract modelspace entities: msp = doc.modelspace()
    - Iterate entities: LINE, LWPOLYLINE, CIRCLE, ARC, INSERT (blocks)
    - Group by layer name (DXF layers often correspond to: walls, doors, columns, electrical, booths)
    - Convert coordinates to our coordinate system (scale + offset based on DXF units)
    - Output: JSON array of geometric primitives with layer metadata

Step 3: Parsed geometry → SVG (for background rendering)
  Tool: ezdxf drawing add-on (exports to matplotlib → SVG) or custom SVG generator
  Process:
    - Take parsed geometry from Step 2
    - Render as SVG with layer-based styling (walls = thick black, columns = gray fill, etc.)
    - SVG is resolution-independent and renders crisply at any zoom level

Step 4: SVG → Konva background
  Process:
    - Load SVG as a Konva.Image on the Background Layer
    - Or: parse SVG paths and render as Konva.Line/Konva.Path shapes (more interactive but heavier)
    - User calibrates scale: "This line = X feet" (two-click measurement tool)

Step 5 (Optional): Auto-detect booths from DXF
  If the venue's DXF has a "BOOTHS" layer with labeled rectangles:
    - Extract booth polygons from that layer
    - Create Booth records from the geometry
    - Auto-assign booth numbers from DXF text labels
    - Present to admin for review/adjustment before committing
  This saves hours of manual redrawing.
```

### Supported Import Formats

| Format | Support Level | Method |
|---|---|---|
| DXF (R12–R2018) | Full | `ezdxf` direct parse |
| DWG | Full (with ODA) | ODA File Converter → DXF → `ezdxf` |
| PDF | Partial | Rasterize first page at 300 DPI → use as background image. No geometry extraction. |
| PNG/JPG/SVG | Full | Direct use as background image |
| AI (Illustrator) | Partial | User exports as SVG first |

### DXF Layer Mapping UI

After DXF import, the admin sees a dialog:

```
We found these layers in your DXF file. Tell us what each one contains:

[✓] Layer "A-WALL"         → [ Structural Walls      ▼]
[✓] Layer "A-COLS"         → [ Columns               ▼]
[✓] Layer "E-POWER"        → [ Electrical Panels      ▼]
[✓] Layer "BOOTHS"         → [ Booth Outlines         ▼]
[✓] Layer "DIMS"           → [ Ignore                 ▼]
[ ] Layer "XREF-HVAC"      → [ Ignore                 ▼]
[ ] Layer "DEFPOINTS"      → [ Ignore                 ▼]

                                  [Import Selected Layers]
```

Options per layer: Structural Walls, Columns, Doors/Openings, Electrical Panels, Booth Outlines, Aisles, Labels, Ignore

---

## 7. Spatial Data Model

### PostgreSQL + PostGIS

We use the PostGIS extension for spatial queries. This enables:

- "Find all booths within 50ft of booth A101" (ST_DWithin)
- "Find the nearest fire exit to booth C305" (ST_Distance + ORDER BY)
- "Does this new booth overlap any existing booth?" (ST_Intersects)
- "What is the total square footage of all sold booths?" (ST_Area aggregate)
- "Generate a walking path from booth A101 to booth E401" (pgRouting on the aisle network)

### Schema

```sql
-- PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Floor Plans
tenant.floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES tenant.shows(id),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, published, archived

  -- Coordinate system
  coordinate_unit VARCHAR(10) NOT NULL DEFAULT 'feet', -- feet, meters
  origin_x DECIMAL NOT NULL DEFAULT 0,
  origin_y DECIMAL NOT NULL DEFAULT 0,

  -- Background
  background_type VARCHAR(20), -- image, svg, dxf_import
  background_url TEXT,
  background_scale DECIMAL, -- pixels-per-unit (how the background maps to real-world coords)
  background_offset_x DECIMAL DEFAULT 0,
  background_offset_y DECIMAL DEFAULT 0,
  background_opacity DECIMAL DEFAULT 0.5,

  -- Canvas state (Konva scene graph JSON — the authoritative representation for the designer)
  canvas_data JSONB,

  -- Grid
  grid_size DECIMAL DEFAULT 5, -- grid spacing in coordinate_unit
  grid_visible BOOLEAN DEFAULT true,
  snap_enabled BOOLEAN DEFAULT true,

  -- Metadata
  total_booths INTEGER DEFAULT 0,
  total_sqft DECIMAL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Booths (the core entity — one row per booth on the floor plan)
tenant.booths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES tenant.floor_plans(id),
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,

  -- Identity
  booth_number VARCHAR(20) NOT NULL, -- e.g., "A101", "E401", "OUT-15"
  booth_type VARCHAR(30) NOT NULL DEFAULT 'inline',
    -- inline, corner, island, peninsula, end_cap, outdoor, custom

  -- Spatial (PostGIS geometry for server-side queries)
  geometry GEOMETRY(POLYGON, 0) NOT NULL, -- booth outline as a polygon (in floor plan coordinate system, not geographic)
  centroid GEOMETRY(POINT, 0), -- auto-calculated center point
  bounding_box BOX, -- for fast overlap checks

  -- Dimensions (derived from geometry, cached for performance)
  sqft DECIMAL NOT NULL,
  width_ft DECIMAL, -- bounding box width
  depth_ft DECIMAL, -- bounding box depth
  frontage_ft DECIMAL, -- length of aisle-facing edge(s)
  perimeter_ft DECIMAL,

  -- Canvas rendering (Konva-specific shape data for client-side rendering)
  shape_type VARCHAR(20) NOT NULL DEFAULT 'rect', -- rect, polygon
  shape_data JSONB NOT NULL,
    -- For rect: {x, y, width, height, rotation}
    -- For polygon: {points: [x1,y1, x2,y2, ...], closed: true}
  position_x DECIMAL NOT NULL,
  position_y DECIMAL NOT NULL,
  rotation DECIMAL DEFAULT 0,

  -- Classification
  pavilion_id UUID REFERENCES tenant.pavilions(id),
  pricing_tier VARCHAR(30) DEFAULT 'standard',
  base_price DECIMAL,
  corner_premium DECIMAL DEFAULT 0,
  total_price DECIMAL GENERATED ALWAYS AS (COALESCE(base_price, 0) + COALESCE(corner_premium, 0)) STORED,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'available',
    -- available, reserved, held, sold, blocked, not_for_sale
  assigned_exhibitor_id UUID REFERENCES tenant.exhibitors(id),
  hold_expires_at TIMESTAMPTZ,

  -- Utility access
  utility_access TEXT[] DEFAULT '{}',
    -- nearby_electrical_panel, floor_outlet, water_access, internet_drop, rigging_point

  -- Neighbor tracking (auto-calculated)
  neighbor_booth_ids UUID[] DEFAULT '{}',

  -- Metadata
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial indexes
CREATE INDEX idx_booths_geometry ON tenant.booths USING GIST (geometry);
CREATE INDEX idx_booths_centroid ON tenant.booths USING GIST (centroid);
CREATE UNIQUE INDEX idx_booths_number_per_plan ON tenant.booths (floor_plan_id, booth_number) WHERE deleted_at IS NULL;

-- Structural elements (non-sellable, imported from CAD or drawn manually)
tenant.floor_plan_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL,
  org_id UUID NOT NULL,
  element_type VARCHAR(30) NOT NULL,
    -- wall, column, door, fire_exit, loading_dock, electrical_panel, restroom, elevator
  geometry GEOMETRY NOT NULL,
  shape_data JSONB NOT NULL, -- Konva rendering data
  label VARCHAR(100),
  layer VARCHAR(50) DEFAULT 'structural',
  style JSONB, -- fill, stroke, strokeWidth, dash pattern
  metadata JSONB
);

-- Aisles (defined as polylines with width)
tenant.floor_plan_aisles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL,
  org_id UUID NOT NULL,
  name VARCHAR(100), -- e.g., "Main Aisle A", "Cross Aisle 3"
  aisle_type VARCHAR(20) DEFAULT 'main', -- main, cross, service, no_freight
  centerline GEOMETRY(LINESTRING, 0) NOT NULL, -- the path of the aisle
  width_ft DECIMAL NOT NULL DEFAULT 8,
  area GEOMETRY(POLYGON, 0), -- auto-generated buffer around centerline
  is_fire_lane BOOLEAN DEFAULT false,
  shape_data JSONB NOT NULL
);

-- Annotations (text, arrows, icons placed by admin)
tenant.floor_plan_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL,
  org_id UUID NOT NULL,
  annotation_type VARCHAR(20) NOT NULL, -- text, arrow, icon
  position_x DECIMAL NOT NULL,
  position_y DECIMAL NOT NULL,
  content JSONB NOT NULL,
    -- text: {text, fontSize, fontFamily, color, rotation}
    -- arrow: {endX, endY, strokeColor, strokeWidth}
    -- icon: {iconType, scale} (iconType = fire_exit, restroom, food_court, etc.)
  layer VARCHAR(50) DEFAULT 'annotations',
  visible BOOLEAN DEFAULT true
);
```

### Spatial Queries We Need

```sql
-- Find all booths within 50ft of a given booth
SELECT b2.*
FROM tenant.booths b1
JOIN tenant.booths b2 ON ST_DWithin(b1.geometry, b2.geometry, 50)
WHERE b1.id = :booth_id AND b2.id != :booth_id;

-- Check if a new booth polygon overlaps any existing booth
SELECT EXISTS (
  SELECT 1 FROM tenant.booths
  WHERE floor_plan_id = :plan_id
    AND ST_Intersects(geometry, ST_GeomFromGeoJSON(:new_booth_geojson))
    AND id != :exclude_booth_id
);

-- Calculate total sold square footage per pavilion
SELECT p.name, SUM(b.sqft) as total_sqft, COUNT(*) as booth_count
FROM tenant.booths b
JOIN tenant.pavilions p ON b.pavilion_id = p.id
WHERE b.show_id = :show_id AND b.status = 'sold'
GROUP BY p.name;

-- Find nearest fire exit from a booth
SELECT s.label, ST_Distance(b.centroid, s.geometry) as distance_ft
FROM tenant.booths b, tenant.floor_plan_structures s
WHERE b.id = :booth_id
  AND s.element_type = 'fire_exit'
  AND s.floor_plan_id = b.floor_plan_id
ORDER BY ST_Distance(b.centroid, s.geometry)
LIMIT 1;
```

---

## 8. Real-Time Collaboration

### The Problem

Multiple admins (promoter + floor manager + sales team) may edit the floor plan simultaneously. We need Google-Docs-style collaboration.

### Architecture

```
Client A (browser)                    Server                          Client B (browser)
    │                                   │                                   │
    ├── Edit booth A101 ──────────────► WebSocket hub ──────────────────►  │
    │                                   │ (FastAPI WebSocket)              │
    │                                   │                                   │
    │                                   ├── Validate edit                   │
    │                                   ├── Apply to DB                     │
    │                                   ├── Broadcast to all                │
    │                                   │   connected clients               │
    │   ◄───────────── Ack ────────────┤                                   │
    │                                   │                                   │
    │                                   ├── Send edit to Client B ────────► Apply edit
    │                                   │                                   │
```

### Collaboration Messages

```typescript
// Client → Server
{ type: 'booth_move', boothId: 'uuid', position: {x: 100, y: 200}, userId: 'uuid' }
{ type: 'booth_resize', boothId: 'uuid', shape: {...}, userId: 'uuid' }
{ type: 'booth_create', booth: {...}, userId: 'uuid' }
{ type: 'booth_delete', boothId: 'uuid', userId: 'uuid' }
{ type: 'booth_property', boothId: 'uuid', property: 'pavilion_id', value: 'uuid', userId: 'uuid' }
{ type: 'cursor_position', position: {x: 350, y: 120}, userId: 'uuid' }
{ type: 'selection_change', boothIds: ['uuid1', 'uuid2'], userId: 'uuid' }

// Server → Clients
{ type: 'edit_applied', edit: {...}, userId: 'uuid', timestamp: 123456 }
{ type: 'edit_rejected', editId: 'xxx', reason: 'overlap_detected' }
{ type: 'user_cursor', position: {x: 350, y: 120}, userId: 'uuid', userName: 'Alice' }
{ type: 'user_selection', boothIds: ['uuid1'], userId: 'uuid', userName: 'Alice' }
{ type: 'user_joined', userId: 'uuid', userName: 'Bob' }
{ type: 'user_left', userId: 'uuid' }
```

### Presence Indicators

- Each connected user gets a colored cursor label (like Figma)
- Selected booths show a colored border matching the selecting user's color
- User avatars in the top-right corner of the designer: "Alice (editing)", "Bob (viewing)"

### Conflict Resolution

- **Optimistic updates:** Client applies edit locally immediately, then sends to server
- **Server validation:** If edit is valid (no overlaps, no permission issues), broadcast to all
- **If rejected:** Client rolls back the local edit, shows error toast
- **Same-booth conflict:** If two users edit the same booth within 1 second, server accepts first, rejects second with "Bob just edited this booth" message

### Connection Management

- WebSocket reconnection with exponential backoff
- If disconnected > 30 seconds: show banner "Connection lost — changes may not be saved"
- On reconnect: sync full canvas state from server (not incremental — simpler and more reliable)

---

## 9. Versioning & History

### Version Model

```sql
tenant.floor_plan_versions (
  id UUID PRIMARY KEY,
  floor_plan_id UUID NOT NULL,
  org_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  canvas_data JSONB NOT NULL, -- full Konva scene graph snapshot
  booth_snapshot JSONB NOT NULL, -- full booth table snapshot for this version
  label VARCHAR(255), -- user-provided label: "After pavilion reorganization"
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

### When Versions Are Created

- **Auto-snapshot:** Every time the floor plan is published (status → `published`)
- **Manual snapshot:** Admin clicks "Save Version" and provides a label
- **Before cloning:** When a show is cloned, the floor plan version is preserved
- **Before bulk operations:** Before a bulk move/delete of 10+ booths

### Version Comparison

- Side-by-side view: two canvases, synced zoom/pan
- Diff overlay: booths added (green), removed (red), moved (yellow arrow from old to new position), resized (blue outline showing old vs. new)
- Version timeline (horizontal list of versions with timestamps and labels)

### Rollback

- Select a version → "Restore This Version" → confirmation dialog → floor plan reverted
- Rollback creates a new version (so you can undo the rollback)

---

## 10. Floor Plan Export

### Export Formats

| Format | Use Case | Method |
|---|---|---|
| **PNG** (high-res) | Email attachments, exhibitor kits, printed signage | Server-side: Puppeteer renders the Konva canvas in a headless browser at 300 DPI |
| **PDF** | Print-ready floor plan for exhibitor kits and on-site signage | Server-side: Puppeteer → PNG → embedded in PDF with title, legend, and scale bar via `reportlab` or `weasyprint` |
| **SVG** | Scalable vector for print shops and large-format printing | Server-side: custom renderer that converts Konva shape data → SVG elements |
| **DXF** | Round-trip back to AutoCAD for the venue's engineering team | Server-side: `ezdxf` generates DXF from booth polygons + structural elements |
| **Interactive embed** | Embed floor plan on third-party websites | `<iframe>` with the viewer application (read-only, configurable branding) |
| **JSON** | API consumers, BI tools, custom integrations | Direct API response of floor plan + booth data |

### Export Customization

Before exporting, admin configures:
- Include/exclude layers (annotations, structural, labels)
- Color scheme (sales status overlay vs. pavilion colors vs. exhibitor directory)
- Legend (show/hide)
- Scale bar (show/hide, unit)
- Title block (show name, dates, version number)
- Page size (for PDF: letter, tabloid, A1, A0, custom)
- Orientation (landscape/portrait)

---

## 11. Performance Budget

### Targets

| Metric | Target | Measured When |
|---|---|---|
| Initial canvas render (Designer) | < 2 seconds | 500 booths + background image |
| Initial canvas render (Viewer) | < 1 second | Same, but no editing tools to initialize |
| Booth click response | < 50ms | Time from click to tooltip/panel appearing |
| Pan/zoom frame rate | ≥ 30 FPS | While dragging/scrolling on canvas with 500+ shapes |
| Booth move (drag) frame rate | ≥ 30 FPS | While dragging a booth across the canvas |
| Search highlight | < 200ms | Time from search result click to booth animation start |
| CAD import (DXF, 5MB file) | < 30 seconds | Server-side processing time |
| Auto-save | < 500ms | Time to serialize canvas and POST to API |
| PNG export (300 DPI) | < 10 seconds | Server-side render time |

### Optimization Strategies

1. **Layer isolation:** Konva's multi-layer approach means editing the Booth Layer doesn't repaint the Background Layer. The background is static after initial setup.

2. **Viewport culling:** Only render shapes that are within (or near) the current viewport. Konva supports this via the `clipFunc` on layers and manual `visible` toggling.

3. **Level of Detail (LOD):** At low zoom levels (zoomed out far), booths render as simple colored rectangles with no labels. At medium zoom, booth numbers appear. At high zoom, full detail (exhibitor names, icons).

4. **Cached rendering:** Use `shape.cache()` for complex shapes that don't change frequently (background, structural elements). Cached shapes render from a pre-rasterized bitmap.

5. **Batch updates:** When loading the floor plan, create all Konva shapes in a batch (layer.batchDraw()) rather than adding one at a time.

6. **Web Workers:** Heavy computations (neighbor detection, overlap checking, aisle validation) run in a Web Worker to keep the main thread free for rendering.

7. **Debounced updates:** During drag operations, update the DB at most once every 500ms, not on every mouse move.

---

## 12. Mobile Rendering Strategy

The Konva.js canvas works on mobile, but a 500-booth floor plan on a phone needs special handling:

### Tile-Based Rendering (for Mobile Viewer)

Instead of rendering all 500 shapes in real-time on a phone:

1. **Server pre-renders the floor plan as tiles** (like Google Maps):
   - Zoom levels 0–4 (0 = whole floor plan in one tile, 4 = zoomed in to individual booths)
   - Each tile is a 256×256 PNG
   - Tiles are generated when the floor plan is published (background job)
   - Stored in S3/CDN

2. **Mobile app uses a tile viewer** (Leaflet.js or react-native-maps with custom tile source):
   - Smooth pan/zoom with tile loading
   - Booth interaction: overlay invisible hit regions on top of tiles
   - Tap a booth → show detail panel (data fetched from API, not from the canvas)

3. **Fallback for low-end devices:**
   - Static PNG floor plan image
   - Booth locations as positioned buttons/hotspots over the image
   - No live canvas rendering

### Responsive Viewer (Tablet/Desktop)

- Full Konva.js canvas rendering (the viewer app)
- Touch events: pinch-to-zoom, two-finger pan
- Larger touch targets for booth tap (minimum 44×44px hit area per Apple HIG)
- Bottom sheet for booth details (instead of right sidebar on mobile)

---

## 13. Integration Points

| Module | Integration | Direction | Method |
|---|---|---|---|
| **M6 Booth Sales** | When exhibitor reserves a booth, booth status updates on the floor plan. When payment succeeds, booth status → `sold` and exhibitor name appears. | M6 → M4 | API call to update booth status; WebSocket broadcast to all viewer/designer clients |
| **M5 Exhibitor CRM** | Exhibitor assigned to booth → CRM shows booth assignment. Exhibitor deleted → booth status reverts to `available`. | Bidirectional | FK relationship `booths.assigned_exhibitor_id` |
| **M8 Services** | When exhibitor orders electrical, system references booth's `utility_access` to determine if service is available. | M8 reads M4 | API query: `GET /booths/:id` includes utility access info |
| **M10 Exhibitor Portal** | Portal shows exhibitor's booth on the interactive floor plan (viewer app embedded in portal). | M4 serves M10 | Viewer component with pre-set zoom/highlight on exhibitor's booth |
| **M11 Promoter Dashboard** | Sales pipeline overlay on floor plan. Occupancy metrics. | M4 serves M11 | Viewer component with sales status color overlay |
| **M17 Mobile App** | Attendee navigates the show floor using the mobile floor plan viewer. | M4 serves M17 | Tile-based rendering (section 12) + API for booth data |
| **M18 Public Website** | Public floor plan with exhibitor directory overlay. | M4 serves M18 | Viewer component embedded in show website pages |
| **M19 On-Site Ops** | Staff reports issue at booth → issue pinned on floor plan. Badge scan → update booth check-in status. | Bidirectional | API: create issue at booth location; update booth check-in status |
| **M16 Reporting** | Occupancy heat map, revenue-per-sqft map, traffic flow visualization. | M4 data → M16 | SQL queries against booth data + PostGIS spatial aggregation |

---

## 14. State Management Architecture

### Client-Side (React/Next.js)

```
                    ┌─────────────────────────────┐
                    │     FloorPlanProvider        │  ← React Context
                    │     (wraps entire module)    │
                    │                              │
                    │  ┌─────────────────────┐     │
                    │  │   Zustand Store      │     │  ← Primary state store
                    │  │                      │     │
                    │  │  floor_plan: {...}    │     │
                    │  │  booths: Map<id,Booth>│     │
                    │  │  structures: [...]    │     │
                    │  │  aisles: [...]        │     │
                    │  │  annotations: [...]   │     │
                    │  │  selection: Set<id>   │     │
                    │  │  activeTool: 'select' │     │
                    │  │  zoom: 1.0            │     │
                    │  │  viewport: {x,y,w,h}  │     │
                    │  │  undoStack: [...]      │     │
                    │  │  redoStack: [...]      │     │
                    │  │  collaborators: [...]  │     │
                    │  │  isDirty: boolean      │     │
                    │  └─────────────────────┘     │
                    │                              │
                    │  ┌─────────────────────┐     │
                    │  │   WebSocket Manager  │     │  ← Real-time sync
                    │  │   (collaboration)    │     │
                    │  └─────────────────────┘     │
                    │                              │
                    │  ┌─────────────────────┐     │
                    │  │   Command Manager    │     │  ← Undo/redo
                    │  │   (command pattern)  │     │
                    │  └─────────────────────┘     │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │         Konva Stage          │
                    │   ┌───────┐ ┌───────┐       │
                    │   │ Layer │ │ Layer │ ...    │
                    │   └───────┘ └───────┘       │
                    └─────────────────────────────┘
```

**Why Zustand (not Redux):**
- Simpler API, less boilerplate
- Supports selectors for fine-grained re-rendering (important when 500 booth components exist)
- Works naturally with React context and hooks
- Middleware support for persistence, devtools, undo

---

## 15. Booth Geometry & Spatial Rules

### Booth Types & Their Geometry Rules

| Type | Description | Open Sides | Geometry | Pricing |
|---|---|---|---|---|
| **Inline** | Standard booth, back wall shared with neighbor | 1 (front/aisle) | Rectangle | Base price |
| **Corner** | End of a row, two sides face aisles | 2 | Rectangle | Base + corner premium |
| **End Cap** | End of a row, three sides face aisles | 3 | Rectangle | Base + end cap premium |
| **Peninsula** | Juts out into aisle, three sides exposed | 3 | Rectangle | Premium tier |
| **Island** | Free-standing, all four sides accessible | 4 | Rectangle or polygon | Premium tier |
| **Outdoor** | In the Outdoor Gem Bazaar / tent area | Varies | Rectangle (often irregular) | Lower rate |
| **Custom** | Any non-standard shape (L, T, irregular polygon) | Varies | Polygon | Custom price |

### Spatial Validation Rules

```python
class BoothValidator:
    MIN_BOOTH_WIDTH_FT = 6
    MIN_BOOTH_DEPTH_FT = 6
    MIN_BOOTH_SQFT = 36
    MAX_BOOTH_SQFT = 10000
    MIN_AISLE_WIDTH_FT = 6  # fire code minimum
    MIN_MAIN_AISLE_WIDTH_FT = 8
    MAX_DISTANCE_TO_FIRE_EXIT_FT = 200  # fire code
    BOOTH_OVERLAP_TOLERANCE_FT = 0.1  # within 0.1ft = touching, not overlapping

    def validate_booth(self, booth, all_booths, structures, aisles):
        errors = []

        # 1. Minimum dimensions
        if booth.width_ft < self.MIN_BOOTH_WIDTH_FT:
            errors.append(f"Width {booth.width_ft}ft below minimum {self.MIN_BOOTH_WIDTH_FT}ft")
        if booth.depth_ft < self.MIN_BOOTH_DEPTH_FT:
            errors.append(f"Depth {booth.depth_ft}ft below minimum {self.MIN_BOOTH_DEPTH_FT}ft")

        # 2. No overlap with other booths
        for other in all_booths:
            if other.id != booth.id:
                if ST_Intersects(booth.geometry, other.geometry):
                    overlap_area = ST_Area(ST_Intersection(booth.geometry, other.geometry))
                    if overlap_area > self.BOOTH_OVERLAP_TOLERANCE_FT ** 2:
                        errors.append(f"Overlaps with booth {other.booth_number}")

        # 3. No overlap with structural elements (columns, walls)
        for struct in structures:
            if ST_Intersects(booth.geometry, struct.geometry):
                errors.append(f"Overlaps with {struct.element_type}: {struct.label}")

        # 4. Must be adjacent to an aisle (at least one side faces an aisle)
        touches_aisle = False
        for aisle in aisles:
            if ST_DWithin(booth.geometry, aisle.area, 1):  # within 1ft of aisle
                touches_aisle = True
                break
        if not touches_aisle:
            errors.append("Booth must be adjacent to at least one aisle")

        # 5. Fire exit distance
        nearest_exit_distance = min(
            ST_Distance(booth.centroid, s.geometry)
            for s in structures if s.element_type == 'fire_exit'
        )
        if nearest_exit_distance > self.MAX_DISTANCE_TO_FIRE_EXIT_FT:
            errors.append(f"Distance to nearest fire exit ({nearest_exit_distance:.0f}ft) exceeds maximum ({self.MAX_DISTANCE_TO_FIRE_EXIT_FT}ft)")

        return errors
```

### Auto-Detect Booth Type

When a booth is drawn or moved, the system auto-detects its type based on aisle adjacency:

```python
def detect_booth_type(booth, aisles):
    aisle_facing_sides = count_aisle_facing_edges(booth.geometry, aisles)
    if aisle_facing_sides == 1:
        return 'inline'
    elif aisle_facing_sides == 2:
        return 'corner'
    elif aisle_facing_sides == 3:
        return 'end_cap' or 'peninsula'  # peninsula if it juts out
    elif aisle_facing_sides == 4:
        return 'island'
    else:
        return 'custom'
```

---

## 16. UI/UX Specification: Designer

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌─ Top Toolbar ───────────────────────────────────────────────────┐ │
│ │ [Undo] [Redo] │ Zoom: [−] 75% [+] [Fit] │ [Grid ☑] [Snap ☑]  │ │
│ │ [Show: JOGS Winter 2027 ▼] │ Version: v3 │ [Save Version]     │ │
│ │ [Publish] │ Collaborators: 👤Alice 👤Bob │ [Export ▼]          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─ Left ─┐ ┌─ Canvas ──────────────────────────┐ ┌─ Right ──────┐ │
│ │ Tools  │ │                                    │ │ Properties   │ │
│ │        │ │                                    │ │              │ │
│ │ [V] Sel│ │                                    │ │ Booth: A101  │ │
│ │ [R] Rec│ │     (Konva Stage renders here)     │ │ Type: Inline │ │
│ │ [P] Pol│ │                                    │ │ Size: 10×10  │ │
│ │ [I] Isl│ │                                    │ │ SqFt: 100    │ │
│ │ [A] Ais│ │                                    │ │ Pavilion: ▼  │ │
│ │ [W] Wal│ │                                    │ │ Price: $3500 │ │
│ │ [C] Col│ │                                    │ │ Status: Sold │ │
│ │ [T] Txt│ │                                    │ │ Exhibitor:   │ │
│ │ [→] Arr│ │                                    │ │  [Search...] │ │
│ │ [★] Ico│ │                                    │ │ Utility: ☑E  │ │
│ │ [M] Mea│ │                                    │ │ Notes: ___   │ │
│ │        │ │                                    │ │              │ │
│ │────────│ │                                    │ │──────────────│ │
│ │ Layers │ │                                    │ │ Bulk Actions │ │
│ │ ☑ Back │ │                                    │ │ (when multi- │ │
│ │ ☑ Struc│ │                                    │ │  selected)   │ │
│ │ ☑ Aisle│ │                                    │ │              │ │
│ │ ☑ Booth│ │                                    │ │──────────────│ │
│ │ ☑ Label│ │                                    │ │ Templates    │ │
│ │ ☑ Annot│ │                                    │ │ [10×10 Inline│ │
│ │ ☑ Statu│ │                        ┌─Minimap─┐│ │ [20×20 Island│ │
│ │        │ │                        │  ┌──┐   ││ │ [10×20 Corner│ │
│ └────────┘ │                        │  └──┘   ││ │ [+ New...    │ │
│            │                        └─────────┘│ └──────────────┘ │
│            └────────────────────────────────────┘                  │
│ ┌─ Bottom Status Bar ─────────────────────────────────────────────┐│
│ │ Booths: 487 total │ Sold: 312 │ Available: 142 │ Blocked: 33   ││
│ │ Total SqFt: 155,000 │ Sold SqFt: 98,400 │ Revenue: $1.2M      ││
│ └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts (Complete)

| Shortcut | Action |
|---|---|
| `V` | Select tool |
| `R` | Rectangle booth tool |
| `P` | Polygon booth tool |
| `I` | Island booth tool |
| `A` | Aisle tool |
| `T` | Text annotation tool |
| `M` | Measure tool |
| `Space` (hold) | Temporary pan mode |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+D` | Duplicate selected |
| `Ctrl+A` | Select all booths |
| `Ctrl+S` | Save |
| `Ctrl+C` / `Ctrl+V` | Copy / paste booth(s) |
| `Escape` | Deselect all / cancel current operation |
| `Arrow keys` | Nudge selected by 1 grid unit |
| `Shift+Arrow` | Nudge by 1/10 grid unit |
| `+` / `-` | Zoom in / out |
| `Ctrl+0` | Fit to screen |
| `[` / `]` | Decrease / increase grid size |
| `G` | Toggle grid |
| `N` | Toggle snap |
| `L` | Toggle labels |
| `1–7` | Toggle layer visibility (1=background, 2=structural, etc.) |

---

## 17. UI/UX Specification: Viewer

### Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌─ Top Bar ───────────────────────────────────────────────────┐  │
│ │ 🔍 [Search exhibitors...              ]  [Filter ▼]  [Zoom]│  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌─ Canvas ─────────────────────────────────┐ ┌─ Detail Panel ─┐ │
│ │                                          │ │                 │ │
│ │                                          │ │  [Exhibitor     │ │
│ │    (Interactive floor plan renders here)  │ │   Logo]         │ │
│ │                                          │ │                 │ │
│ │                                          │ │  Company Name   │ │
│ │                                          │ │  Booth: A101    │ │
│ │                                          │ │  Pavilion: Amber│ │
│ │                                          │ │                 │ │
│ │                                          │ │  Products:      │ │
│ │                                          │ │  Baltic amber   │ │
│ │                                          │ │  beads, cabochon│ │
│ │                                          │ │                 │ │
│ │                                          │ │  [🖼 Photos]     │ │
│ │                                          │ │                 │ │
│ │                                          │ │  [View Profile] │ │
│ │                           ┌──Minimap──┐  │ │  [Reserve ▶]    │ │
│ │                           │           │  │ │                 │ │
│ │                           └───────────┘  │ │                 │ │
│ └──────────────────────────────────────────┘ └─────────────────┘ │
│ ┌─ Legend ─────────────────────────────────────────────────────┐  │
│ │ 🟦 Amber  🟩 Southwest  🟨 Designer  🟪 Bali Silver  ⬜ Avail│  │
│ └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Layout (Mobile — Bottom Sheet Pattern)

```
┌───────────────┐
│ 🔍 [Search..] │
├───────────────┤
│               │
│  (Full-screen │
│   floor plan  │
│   with touch  │
│   interaction)│
│               │
│               │
│               │
│               │
│  ┌─Minimap─┐  │
│  └─────────┘  │
├───────────────┤  ← Swipe up to expand
│ ▉ Booth A101  │
│ Nativa Gems   │
│ Baltic amber  │
│ [View Profile]│
└───────────────┘
```

---

## 18. API Endpoints

```
# Floor Plan CRUD
GET    /api/v1/shows/:showId/floor-plan                    # Get the published floor plan for a show
GET    /api/v1/shows/:showId/floor-plan/edit               # Get the editable (draft) floor plan (admin)
POST   /api/v1/shows/:showId/floor-plan                    # Create a floor plan for a show
PATCH  /api/v1/shows/:showId/floor-plan                    # Update floor plan metadata (name, grid, bg)
POST   /api/v1/shows/:showId/floor-plan/publish            # Publish the current draft
POST   /api/v1/shows/:showId/floor-plan/clone              # Clone floor plan from another show
DELETE /api/v1/shows/:showId/floor-plan                     # Delete (soft) the floor plan

# Background / CAD Import
POST   /api/v1/shows/:showId/floor-plan/background         # Upload background image
POST   /api/v1/shows/:showId/floor-plan/import-cad         # Upload DWG/DXF for conversion
GET    /api/v1/shows/:showId/floor-plan/import-cad/:jobId   # Check CAD import job status
POST   /api/v1/shows/:showId/floor-plan/calibrate          # Set scale/origin from two-point calibration

# Canvas State (for real-time collaboration fallback)
PUT    /api/v1/shows/:showId/floor-plan/canvas              # Save full canvas state (auto-save)
GET    /api/v1/shows/:showId/floor-plan/canvas              # Load full canvas state

# Booths
GET    /api/v1/shows/:showId/booths                         # List all booths (with filters)
POST   /api/v1/shows/:showId/booths                         # Create a booth
GET    /api/v1/shows/:showId/booths/:boothId                # Get booth details
PATCH  /api/v1/shows/:showId/booths/:boothId                # Update booth properties
DELETE /api/v1/shows/:showId/booths/:boothId                # Delete a booth
POST   /api/v1/shows/:showId/booths/bulk                    # Bulk create (from row generator)
PATCH  /api/v1/shows/:showId/booths/bulk                    # Bulk update (assign pavilion, etc.)
POST   /api/v1/shows/:showId/booths/:boothId/split          # Split a booth
POST   /api/v1/shows/:showId/booths/merge                   # Merge two booths
GET    /api/v1/shows/:showId/booths/:boothId/neighbors      # Get neighboring booths
POST   /api/v1/shows/:showId/booths/validate                # Validate all booths (run spatial rules)
GET    /api/v1/shows/:showId/booths/search?q=               # Search booths by exhibitor name/number

# Spatial Queries
GET    /api/v1/shows/:showId/booths/nearby?boothId=&radius= # Find booths near a given booth
GET    /api/v1/shows/:showId/booths/available?pavilion=&type=&minSqft=&maxPrice= # Filter available booths

# Structural Elements
GET    /api/v1/shows/:showId/floor-plan/structures          # List all structures
POST   /api/v1/shows/:showId/floor-plan/structures          # Create structural element
PATCH  /api/v1/shows/:showId/floor-plan/structures/:id      # Update
DELETE /api/v1/shows/:showId/floor-plan/structures/:id      # Delete

# Aisles
GET    /api/v1/shows/:showId/floor-plan/aisles
POST   /api/v1/shows/:showId/floor-plan/aisles
PATCH  /api/v1/shows/:showId/floor-plan/aisles/:id
DELETE /api/v1/shows/:showId/floor-plan/aisles/:id

# Annotations
GET    /api/v1/shows/:showId/floor-plan/annotations
POST   /api/v1/shows/:showId/floor-plan/annotations
PATCH  /api/v1/shows/:showId/floor-plan/annotations/:id
DELETE /api/v1/shows/:showId/floor-plan/annotations/:id

# Versions
GET    /api/v1/shows/:showId/floor-plan/versions            # List all versions
GET    /api/v1/shows/:showId/floor-plan/versions/:versionId # Get a specific version
POST   /api/v1/shows/:showId/floor-plan/versions            # Create a named version snapshot
POST   /api/v1/shows/:showId/floor-plan/versions/:versionId/restore # Rollback to version

# Export
POST   /api/v1/shows/:showId/floor-plan/export              # Generate export (returns job ID)
GET    /api/v1/shows/:showId/floor-plan/export/:jobId        # Check export status / download

# Tiles (for mobile)
GET    /api/v1/shows/:showId/floor-plan/tiles/:z/:x/:y.png  # Get map tile at zoom/x/y

# WebSocket
WS     /ws/floor-plan/:showId                                # Real-time collaboration channel
```

**Estimated endpoint count: 35**

---

## 19. Testing Strategy

### Unit Tests (Jest + React Testing Library)

- Booth geometry calculations (area, perimeter, frontage, centroid)
- Overlap detection algorithm
- Neighbor detection algorithm
- Auto-numbering logic
- Price calculation (base + premiums + surcharges)
- Coordinate system conversions (canvas coords ↔ real-world coords ↔ DB coords)
- Command pattern (execute/undo for each command type)

### Integration Tests (Playwright)

- Draw a rectangular booth → verify it appears on canvas and in DB
- Import a DXF file → verify structures appear on canvas
- Move a booth → verify new position persists after refresh
- Two browsers editing simultaneously → verify real-time sync
- Filter by pavilion → verify only matching booths visible
- Export to PNG → verify image contains booths
- Booth selection → verify reservation flow triggers (integration with M6)

### Performance Tests (Lighthouse + Custom)

- Load floor plan with 500 booths → measure FCP, LCP, TTI
- Pan/zoom with 500 booths → measure FPS (canvas performance.mark API)
- Mobile viewer with tiles → measure tile load time per zoom level

### Visual Regression Tests (Percy or Chromatic)

- Snapshot the floor plan at known states
- Detect unintended visual changes on code updates
- Compare pavilion colors, booth shapes, label positioning

---

## 20. Build Phases & Milestones

| Week | Milestone | Deliverable |
|---|---|---|
| 1–3 | **Foundation** | PostGIS setup, booth data model, Konva.js spike with 100 shapes, background image upload |
| 4–5 | **Canvas Core** | Drawing tools (rect, polygon), select/move/resize, grid/snap, zoom/pan, basic property inspector |
| 6–7 | **Booth Intelligence** | Auto-numbering, row generator, neighbor detection, overlap validation, booth type auto-detection |
| 8–9 | **CAD Import** | DXF parsing pipeline, layer mapping UI, SVG background rendering, scale calibration |
| 10 | **Viewer V1** | Read-only interactive viewer with color coding, click-to-detail, search, filter |
| 11–12 | **Collaboration** | WebSocket sync, presence indicators, conflict resolution, multi-user editing |
| 13–14 | **Advanced Designer** | Polygon booths, split/merge, bulk operations, undo/redo (100 steps), template library |
| 15–16 | **Versioning & Export** | Version history, diff view, rollback, PNG/PDF/SVG/DXF export, embed code |
| 17–18 | **Mobile** | Tile generation pipeline, mobile viewer (React Native), offline tile caching |
| 19–20 | **Integration** | Wire up to M6 (booth sales), M10 (exhibitor portal), M17 (mobile app), M18 (public site) |
| 21 | **Polish** | Performance optimization, accessibility audit, edge case fixes, load testing |

---

## 21. Risks & Mitigations

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| Konva.js performance degrades at 500+ shapes | HIGH | LOW | Multi-layer architecture, viewport culling, shape caching. Tested in spike (week 1–3). |
| DWG → DXF conversion loses geometry or produces garbage | HIGH | MEDIUM | ODA File Converter is mature but imperfect. Provide manual fallback (user exports DXF from AutoCAD). Always show preview before committing import. |
| Real-time collaboration introduces data corruption | HIGH | MEDIUM | Start with single-user editing (collab in Phase 2). Use server-authoritative model (server validates all edits). |
| PostGIS spatial queries are slow on 500 booths | LOW | LOW | 500 polygons is trivial for PostGIS. Index everything. |
| Mobile tile rendering is janky | MEDIUM | MEDIUM | Use Leaflet.js (battle-tested map tile viewer). Pre-generate tiles during publish (not on-the-fly). |
| Floor plan designer is too complex for non-technical promoters | HIGH | MEDIUM | Invest heavily in UX: smart defaults, templates, row generator, auto-numbering. User testing with Vitaly's team in week 14. |
| Booth geometry is off by fractional feet → pricing disputes | HIGH | LOW | Use DECIMAL(10,2) everywhere. Show live dimensions during drawing. Require admin approval before publishing. |
| Canvas state (Konva JSON) grows too large to save quickly | MEDIUM | LOW | Konva JSON for 500 shapes is ~2–5MB. Compress with gzip before save. Delta-save (only changed shapes) for auto-save. |

---

## 22. Open Source & Licensing

| Dependency | License | Risk |
|---|---|---|
| **Konva.js** | MIT | None — fully permissive |
| **react-konva** | MIT | None |
| **PostGIS** | GPL v2 | Server-side only — GPL does not affect our proprietary code since PostGIS is a separate server process, not linked into our code |
| **ezdxf** | MIT | None |
| **ODA File Converter** | Proprietary (free for use) | Redistribution requires ODA membership. We run it server-side; users don't download it. Check ODA license terms for SaaS use. May need commercial license. |
| **Puppeteer** | Apache 2.0 | None |
| **Leaflet.js** (mobile tiles) | BSD-2-Clause | None |

**Action item:** Verify ODA File Converter licensing for SaaS deployment before Phase 1 commit. If license is problematic, fall back to requiring users to export DXF themselves (AutoCAD and BricsCAD both support this natively).

---

*This specification should be reviewed by the Floor Plan squad lead and the overall tech lead before Phase 0 begins. It is the foundational document for the highest-risk module in Conventioneer.*
