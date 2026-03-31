# Conventioneer Floor Plan — Simplified Spec (Reality-Based)

**Based on actual JOGS 2020 floor plan analysis**
**Revised: March 30, 2026**

---

## What We Actually See

Looking at the real JOGS floor plan, this is what exists:

### The Venue Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         EAST HALL                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  International Mineral & Gem Décor Pavilion             │    │
│  │  Home/Gem Décor Pavilion                                │    │
│  │  [rows of rectangular booths in a grid]                 │    │
│  └─────────────────────────────────────────────────────────┘    │
├──────────────┬────────────────────────────┬──────────────────────┤
│  NORTH HALL  │      (center area)         │    SOUTH HALL        │
│              │                            │                      │
│ Silver       │  International  Southwestern│ Designer Jewelry     │
│ Jewelry      │  Gemstone       Jewelry &   │ Gem Décor           │
│ Pavilion     │  Pavilion       Turquoise   │ Silver Jewelry      │
│              │                 Pavilion    │ Int'l Gem & Jewelry  │
│ Jewelry,     │  International             │                      │
│ Chains &     │  Jewelry        Southwestern│ Jewelry Making      │
│ Findings     │  Pavilion       Jewelry     │ Classes & Seminars   │
│              │                 Pavilion    │                      │
│ Jewelry,     │                            │                      │
│ Chains,      │  Ball Pavilion             │                      │
│ Beads &      │                            │                      │
│ Findings     │  Amber Pavilion            │                      │
│              │                            │                      │
│ Repair/      │  Food Court                │                      │
│ Groups       │                            │                      │
├──────────────┤           WEST HALL         ├──────────────────────┤
│              │  West Hall Registration     │                      │
│ Outdoor      │                            │  Tents (right side)  │
│ Dealers      │  Outdoor Dealers           │  Registration        │
│              │  Tents W                   │                      │
│ [tent grids] │                            │  Shuttle Hub         │
└──────────────┴────────────────────────────┴──────────────────────┘
```

### What the booths actually are

Every single booth on this map is a **rectangle**. They come in maybe **3-4 sizes**:
- Small (looks like ~8×8 or 10×10)
- Medium (10×20 or similar — two smalls combined)
- Large (end-of-row or island, maybe 20×20)
- Outdoor tent plots (larger rectangles in the tent areas)

They're arranged in **rows within pavilions**. The rows are straight. The aisles are straight. There is nothing irregular, nothing polygonal, nothing requiring computational geometry.

### What actually changes between shows

Based on the fact that JOGS runs Winter, Fall, and Las Vegas shows:

1. **Which pavilions exist and where they go** — the Amber Pavilion might grow or shrink; a new pavilion might be added
2. **How many booths are in each pavilion** — add a row, remove a row, adjust sizes
3. **Which exhibitor is in which booth** — the core assignment problem
4. **Booth status** — available, sold, held, blocked
5. **Booth pricing** — may differ by pavilion, by size, by location (corner, aisle-front)
6. **Show-to-show cloning** — "Start with last year's layout, adjust"

That's it. That's literally everything.

---

## What We DON'T Need

| Overengineered Feature | Why Not |
|---|---|
| PostGIS / spatial geometry engine | Every booth is a rectangle at a grid position. `row`, `column`, `pavilion` is sufficient. |
| Konva.js canvas rendering with 500 shapes | An HTML/CSS grid or a simple SVG with colored rectangles does this perfectly. |
| DWG/DXF CAD import pipeline | The venue floor plan is a background image. Upload a PNG/PDF. Done. |
| Polygon drawing tools | There are no polygons. Only rectangles. |
| Real-time WebSocket collaboration | Two people won't be editing the floor plan at the exact same time. Optimistic locking (last-save-wins with conflict warning) is fine. |
| Tile-based mobile rendering | This floor plan fits on a phone screen. It's one image with interactive hotspots. |
| A* pathfinding for wayfinding | The venue has 4 halls with a center area. You can see everything from anywhere. "Go to North Hall" is sufficient. |
| ODA File Converter for DWG→DXF | Nobody is giving us a DWG file. They have this PNG/PDF already. |
| Puppeteer for server-side export | Export the SVG or screenshot the div. |
| 100-step undo/redo command pattern | This isn't Figma. An admin makes maybe 20 changes per session. Browser undo + "Revert to last save" is enough. |

---

## What We Actually Build

### The Data Model (Simple)

```sql
-- A venue has halls
tenant.halls (
  id UUID PRIMARY KEY,
  venue_id UUID NOT NULL,
  org_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,        -- "North Hall", "East Hall", "Outdoor Tents W"
  hall_type VARCHAR(30),              -- indoor, outdoor, tent
  position_on_map JSONB,             -- {x, y, width, height} as % of background image
  sort_order INTEGER
);

-- A show has pavilions (themed zones within halls)
tenant.pavilions (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  hall_id UUID NOT NULL,
  org_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,        -- "Amber Pavilion", "Silver Jewelry Pavilion"
  color VARCHAR(7),                  -- hex color for the map
  description TEXT,
  position_on_map JSONB,             -- {x, y, width, height} as % of background image
  sort_order INTEGER
);

-- Booths are rectangles in a pavilion
tenant.booths (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  pavilion_id UUID NOT NULL,
  org_id UUID NOT NULL,

  -- Identity
  booth_number VARCHAR(20) NOT NULL,  -- "E401", "W9", "N710"

  -- Size (that's it — it's a rectangle)
  width_ft DECIMAL NOT NULL,          -- 10
  depth_ft DECIMAL NOT NULL,          -- 10
  sqft DECIMAL GENERATED ALWAYS AS (width_ft * depth_ft) STORED,

  -- Position on the map
  grid_row INTEGER,                   -- row within the pavilion grid
  grid_col INTEGER,                   -- column within the pavilion grid
  -- OR, for more flexible placement:
  map_x DECIMAL,                      -- x position as % of background image
  map_y DECIMAL,                      -- y position as % of background image
  map_width DECIMAL,                  -- rendered width as % of background image
  map_height DECIMAL,                 -- rendered height as % of background image
  rotation DECIMAL DEFAULT 0,         -- 0 or 90, that's it

  -- Type & pricing
  booth_type VARCHAR(20) DEFAULT 'inline',  -- inline, corner, island, outdoor
  pricing_tier VARCHAR(20) DEFAULT 'standard',
  base_price DECIMAL,

  -- Status
  status VARCHAR(20) DEFAULT 'available',  -- available, held, sold, blocked
  assigned_exhibitor_id UUID,
  hold_expires_at TIMESTAMPTZ,

  -- Misc
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (show_id, booth_number)
);
```

**That's ~3 tables for the floor plan.** Not 8. Not with PostGIS. Not with geometry polygons.

### The Floor Plan Background

```sql
tenant.floor_plan_backgrounds (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  image_url TEXT NOT NULL,            -- uploaded PNG/PDF/JPG of the venue layout
  image_width_px INTEGER,
  image_height_px INTEGER,
  -- That's literally it
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

The admin uploads the floor plan image (like the one you just showed me). Booths are positioned as overlays on top of that image. Done.

### The Editor (What It Actually Looks Like)

Forget Konva.js. This is a **React component with absolute-positioned divs on top of a background image.**

```
┌─────────────────────────────────────────────────────────────┐
│ Floor Plan Editor — JOGS Winter 2027                        │
│ [Upload Background] [Add Pavilion] [Add Booth Row] [Save]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Background Image (the PNG you uploaded) ─────────────┐  │
│  │                                                       │  │
│  │   ┌──────────────────────┐                           │  │
│  │   │  Amber Pavilion      │ ← draggable/resizable zone│  │
│  │   │  ┌───┬───┬───┬───┐  │                           │  │
│  │   │  │A01│A02│A03│A04│  │ ← colored rectangles      │  │
│  │   │  ├───┼───┼───┼───┤  │   (click to select,       │  │
│  │   │  │A05│A06│A07│A08│  │    drag to reposition)    │  │
│  │   │  ├───┼───┼───┼───┤  │                           │  │
│  │   │  │A09│A10│A11│A12│  │                           │  │
│  │   │  └───┴───┴───┴───┘  │                           │  │
│  │   └──────────────────────┘                           │  │
│  │                                                       │  │
│  │   ┌──────────────────────────────┐                   │  │
│  │   │  Silver Jewelry Pavilion     │                   │  │
│  │   │  ┌───┬───┬───┬───┬───┬───┐  │                   │  │
│  │   │  │S01│S02│S03│S04│S05│S06│  │                   │  │
│  │   │  ├───┼───┼───┼───┼───┼───┤  │                   │  │
│  │   │  │S07│S08│S09│...│...│...│  │                   │  │
│  │   │  └───┴───┴───┴───┴───┴───┘  │                   │  │
│  │   └──────────────────────────────┘                   │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─ Selected: Booth A03 ──────────────────────────────────┐  │
│ │ Number: [A03  ] Size: [10]×[10] ft  Pavilion: [Amber ▼]│  │
│ │ Type: [Inline ▼]  Price: [$3,500]  Status: [Available ▼]│  │
│ │ Exhibitor: [Search...          ]  Notes: [__________ ] │  │
│ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### How The Editor Works

**Step 1: Upload background**
- Admin uploads the venue floor plan image (PNG, JPG, or PDF first-page)
- Image displays as the full background of the editor canvas

**Step 2: Define pavilions**
- Click "Add Pavilion" → draw a rectangle on the background image (click-drag)
- Name it, assign a color
- The pavilion is now a semi-transparent colored overlay on the background
- Can drag to reposition, drag edges to resize

**Step 3: Add booths**
- Click a pavilion → "Add Row of Booths"
- Configure: how many booths, booth width, booth depth, starting number, prefix
- System generates a row of equally-spaced rectangles inside the pavilion
- Or: "Add Single Booth" → click to place a single booth rectangle
- Booths snap to a simple grid (no sub-pixel precision needed)

**Step 4: Adjust**
- Click a booth to select it → edit properties in the bottom panel
- Drag a booth to reposition within its pavilion
- Drag booth edge to resize (constrained to maintain rectangular shape)
- Right-click → Delete, Duplicate, Change Pavilion
- Select multiple (Shift+click) → bulk assign pavilion, pricing tier, status

**Step 5: Clone for next show**
- "Clone from: [JOGS Winter 2026 ▼]" → copies all pavilions, booths, and their positions
- Exhibitor assignments are cleared (all booths reset to "available")
- Admin adjusts: add new pavilion, remove old one, resize, re-number

**That's the entire editor.** No Konva.js. No PostGIS. No WebSocket collaboration. No command pattern. Just React components with drag/resize on top of an image.

### Technology

| Component | Tech | Why |
|---|---|---|
| Background image | `<img>` tag in a scrollable/zoomable container | It's an image. |
| Zoom/pan | CSS `transform: scale()` + overflow scroll, or a lightweight lib like `react-zoom-pan-pinch` | Library is 8KB. Does everything we need. |
| Pavilion overlays | Absolutely positioned `<div>` elements with colored background + opacity | Simple CSS |
| Booth rectangles | Absolutely positioned `<div>` elements inside pavilion containers | Simple CSS |
| Drag to reposition | `react-dnd` or `@dnd-kit/core` or just native HTML drag events | Standard library, well-tested |
| Resize | Drag handles on booth edges (4 small squares at corners/edges) | 50 lines of custom code |
| Selection | Click → `selectedBoothId` state. Shift+click → multi-select set. | React state |
| Properties panel | Form at the bottom. Bound to selected booth. `onBlur` → save. | Standard React form |
| Booth colors | Dynamic `background-color` style based on status or pavilion | Inline style or CSS class |
| Save | `PUT /api/v1/shows/:id/floor-plan` → sends all pavilion + booth data as JSON | One API call |
| Auto-save | Debounced save 5 seconds after last change | `setTimeout` + dirty flag |

### The Viewer (Public / Exhibitor / Mobile)

Same approach, but read-only:

```tsx
// This is almost the entire viewer component
function FloorPlanViewer({ showId }) {
  const { floorPlan, booths, pavilions } = useFloorPlan(showId);
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pavilionFilter, setPavilionFilter] = useState(null);

  const filteredBooths = booths.filter(b => {
    if (pavilionFilter && b.pavilionId !== pavilionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.boothNumber.toLowerCase().includes(q) ||
             b.exhibitorName?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="floor-plan-viewer">
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <PavilionFilter pavilions={pavilions} selected={pavilionFilter}
                      onChange={setPavilionFilter} />

      <ZoomPanContainer>
        <img src={floorPlan.backgroundImageUrl} className="floor-plan-bg" />

        {pavilions.map(p => (
          <PavilionOverlay key={p.id} pavilion={p} dimmed={pavilionFilter && pavilionFilter !== p.id} />
        ))}

        {filteredBooths.map(b => (
          <BoothRect
            key={b.id}
            booth={b}
            selected={selectedBooth?.id === b.id}
            highlighted={searchQuery && matchesBooth(b, searchQuery)}
            onClick={() => setSelectedBooth(b)}
          />
        ))}
      </ZoomPanContainer>

      {selectedBooth && <BoothDetailPanel booth={selectedBooth} onClose={() => setSelectedBooth(null)} />}
    </div>
  );
}
```

**That's it.** The viewer is one React component. It loads the background image, renders colored divs for pavilions and booths, and shows a detail panel when you click. It works on desktop and mobile because it's just HTML/CSS with `react-zoom-pan-pinch` for touch gestures.

### Export

| Format | How |
|---|---|
| PNG | `html2canvas` library → screenshot the viewer div. 5 lines of code. |
| PDF | `html2canvas` → image → `jsPDF` to wrap it in a PDF with title and legend. 20 lines. |
| Print | CSS `@media print` styles. The browser's print dialog does the rest. |

No Puppeteer. No server-side rendering. No tile generation.

---

## Revised Team & Timeline

| What | Old Spec | New Reality |
|---|---|---|
| Engineers | 10 | **2** (one senior frontend, one backend) |
| Duration | 21 weeks | **4-5 weeks** |
| Dependencies | PostGIS, Konva.js, ezdxf, ODA converter, Puppeteer, Leaflet, WebSocket server | `react-zoom-pan-pinch`, `react-dnd`, `html2canvas` |
| Database tables | 8 (with geometry columns) | **3** (simple columns) |
| API endpoints | 35 | **~12** |
| Lines of code (estimate) | 30,000+ | **3,000–5,000** |

### API Endpoints (Revised)

```
# Floor Plan
GET    /api/v1/shows/:showId/floor-plan          # Get floor plan (background + pavilions + booths)
PUT    /api/v1/shows/:showId/floor-plan          # Save floor plan (full state)
POST   /api/v1/shows/:showId/floor-plan/clone    # Clone from another show
POST   /api/v1/shows/:showId/floor-plan/background  # Upload background image

# Pavilions
POST   /api/v1/shows/:showId/pavilions           # Create pavilion
PATCH  /api/v1/shows/:showId/pavilions/:id       # Update pavilion
DELETE /api/v1/shows/:showId/pavilions/:id       # Delete pavilion

# Booths
POST   /api/v1/shows/:showId/booths              # Create booth(s) — single or batch (row generator)
PATCH  /api/v1/shows/:showId/booths/:id          # Update booth
PATCH  /api/v1/shows/:showId/booths/bulk         # Bulk update (assign pavilion, status, price)
DELETE /api/v1/shows/:showId/booths/:id          # Delete booth
GET    /api/v1/shows/:showId/booths/search?q=    # Search by exhibitor name or booth number
```

12 endpoints. Done.

### 5-Week Build Plan

| Week | Deliverable |
|---|---|
| 1 | Data model, API endpoints, background image upload, basic viewer (background + colored booth divs) |
| 2 | Editor: add/edit/delete pavilions as draggable overlays. Add booth row generator. Click-to-edit booth properties. |
| 3 | Editor: drag-to-reposition booths, resize, multi-select, bulk assign. Clone from previous show. Auto-save. |
| 4 | Viewer: search, pavilion filter, booth detail panel with exhibitor info, zoom/pan (desktop + mobile touch). Export PNG/PDF. |
| 5 | Integration with booth sales (M6): clicking "Reserve" on the viewer triggers the booking flow. Status updates reflect on the map in real-time. Polish, edge cases, testing. |

---

## What Stayed The Same

The business logic from the original spec is still valid:

- **Booth types** (inline, corner, island, outdoor) — still need these, just stored as a simple enum column
- **Booth status flow** (available → held → sold → blocked) — same
- **Pavilion concept** — same, it's the primary organizational unit
- **Show cloning** — same, essential for year-over-year operations
- **Search and filter** — same, just implemented as simple string matching instead of Turbopuffer vector search
- **Exhibitor assignment** — same, it's a foreign key
- **Pricing by type/location** — same

## What We Dropped

Everything that was solving a problem the actual floor plan doesn't have:

- PostGIS spatial queries → simple `pavilion_id` and `grid_row`/`grid_col` 
- Konva.js canvas → HTML divs on an image
- DWG/DXF import pipeline → image upload
- Polygon drawing tools → everything is a rectangle
- Real-time WebSocket collaboration → auto-save + optimistic locking
- A* pathfinding → "Go to North Hall, it's on the left"
- Tile-based mobile rendering → CSS zoom on a phone browser
- 100-step undo → "Revert to last save"
- Server-side Puppeteer export → `html2canvas` in the browser
- Version history with visual diff → "Clone from previous show"

---

## The Lesson

The original spec was designed for a **hypothetical convention center with infinite geometric complexity**. The actual JOGS floor plan is:

> Colored rectangles in a grid, on top of a picture of a building.

Build for the reality. If someday a franchise client has a venue with hexagonal booths and curved walls, **that's a future problem for a future sprint**. Ship the rectangle version in 5 weeks and go solve the harder problems — like the services marketplace, which is the actual differentiator nobody else has built.

---

*Revised March 30, 2026 after reviewing the actual JOGS floor plan.*
