# Floor Plan Module — Technical Specification

**Module 4 | Conventioneer Platform**
**Version 1.0 | March 31, 2026**
**Stack: Next.js (React) + Python (FastAPI) + PostgreSQL**
**Team: 2 engineers (1 senior frontend, 1 backend) | 5 weeks**

---

## 1. Overview

The floor plan module provides two interfaces:

1. **Editor** (admin) — position rectangular booths on top of a venue background image, assign them to pavilions, set pricing/status, and assign exhibitors.
2. **Viewer** (public/exhibitor/mobile) — browse the floor plan, search exhibitors, filter by pavilion, click booths for details, and trigger the booking flow.

Both are standard React components rendering HTML divs over a background image. No canvas library, no spatial database extensions, no real-time collaboration protocol.

### Design Principles

- Every booth is a rectangle. No polygons, no curves, no irregular geometry.
- The venue layout is a background image (PNG/JPG/PDF). Booths are positioned as overlays.
- One admin edits at a time. Auto-save + optimistic locking, not WebSockets.
- Export via client-side screenshot (`html2canvas`), not server-side rendering.
- Build for JOGS reality (4 halls, ~500 rectangular booths in grid rows). Extend later if needed.

---

## 2. Data Model

### 2.1 Tables

```sql
-- ============================================================
-- Floor plan background image
-- ============================================================
CREATE TABLE tenant.floor_plan_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES tenant.shows(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  image_width_px INTEGER,
  image_height_px INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_fpbg_show ON tenant.floor_plan_backgrounds(show_id);

-- ============================================================
-- Pavilions — themed zones positioned on the background image
-- ============================================================
CREATE TABLE tenant.pavilions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES tenant.shows(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES tenant.halls(id),
  org_id UUID NOT NULL,

  name VARCHAR(100) NOT NULL,             -- "Amber Pavilion"
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- hex for map overlay
  description TEXT,

  -- Position as % of background image (0-100)
  map_x DECIMAL NOT NULL DEFAULT 0,
  map_y DECIMAL NOT NULL DEFAULT 0,
  map_width DECIMAL NOT NULL DEFAULT 20,
  map_height DECIMAL NOT NULL DEFAULT 20,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pavilions_show ON tenant.pavilions(show_id);

-- ============================================================
-- Booths — rectangles inside pavilions
-- ============================================================
CREATE TABLE tenant.booths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES tenant.shows(id) ON DELETE CASCADE,
  pavilion_id UUID NOT NULL REFERENCES tenant.pavilions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,

  -- Identity
  booth_number VARCHAR(20) NOT NULL,       -- "A101", "E401", "OUT-15"

  -- Dimensions (real-world feet)
  width_ft DECIMAL(8,2) NOT NULL,
  depth_ft DECIMAL(8,2) NOT NULL,
  sqft DECIMAL(10,2) GENERATED ALWAYS AS (width_ft * depth_ft) STORED,

  -- Position as % of background image
  map_x DECIMAL NOT NULL DEFAULT 0,
  map_y DECIMAL NOT NULL DEFAULT 0,
  map_width DECIMAL NOT NULL DEFAULT 5,
  map_height DECIMAL NOT NULL DEFAULT 5,
  rotation DECIMAL(5,2) NOT NULL DEFAULT 0, -- degrees, typically 0 or 90

  -- Classification
  booth_type VARCHAR(20) NOT NULL DEFAULT 'inline',
    -- inline | corner | island | end_cap | outdoor
  pricing_tier VARCHAR(20) NOT NULL DEFAULT 'standard',
    -- standard | premium | super_premium | economy
  base_price DECIMAL(10,2),
  corner_premium DECIMAL(10,2) DEFAULT 0,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'available',
    -- available | held | reserved | sold | blocked | not_for_sale
  assigned_exhibitor_id UUID REFERENCES tenant.exhibitors(id) ON DELETE SET NULL,
  hold_expires_at TIMESTAMPTZ,

  -- Grid position (optional — for row-generated booths)
  grid_row INTEGER,
  grid_col INTEGER,

  -- Metadata
  notes TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_booth_number_per_show UNIQUE (show_id, booth_number)
);

CREATE INDEX idx_booths_show ON tenant.booths(show_id);
CREATE INDEX idx_booths_pavilion ON tenant.booths(pavilion_id);
CREATE INDEX idx_booths_status ON tenant.booths(show_id, status);
CREATE INDEX idx_booths_exhibitor ON tenant.booths(assigned_exhibitor_id);
```

### 2.2 Entity Relationships

```
show (1) ──── (1) floor_plan_background
show (1) ──── (*) pavilions
pavilion (1) ──── (*) booths
booth (*) ──── (0..1) exhibitor
```

### 2.3 Status Flow

```
available ──► held ──► reserved ──► sold
    │            │         │
    │            ▼         ▼
    │        available  available   (hold expired / reservation cancelled)
    │
    ▼
  blocked ──► available              (admin unblocks)
```

- **held**: 15-minute timer. Auto-reverts to `available` when `hold_expires_at` passes.
- **reserved**: Exhibitor has submitted a reservation, awaiting payment.
- **sold**: Payment received. Exhibitor assigned.
- **blocked**: Admin removed from sale (renovation, structural issue, etc.).

---

## 3. API Endpoints

Base path: `/api/v1/shows/{show_id}`

### 3.1 Floor Plan Background

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/floor-plan/background` | Upload background image (multipart). Returns `image_url`. |
| `GET` | `/floor-plan` | Get full floor plan: background + pavilions + booths (public). |
| `GET` | `/floor-plan/edit` | Same but includes draft/blocked booths (admin). |
| `PUT` | `/floor-plan` | Save full floor plan state (all pavilion + booth positions). Used by auto-save. |
| `POST` | `/floor-plan/clone` | Clone floor plan from another show. Body: `{ source_show_id }`. Copies pavilions + booths, resets all statuses to `available`, clears exhibitor assignments. |

### 3.2 Pavilions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pavilions` | Create pavilion. Body: `{ name, color, hall_id?, map_x, map_y, map_width, map_height }` |
| `PATCH` | `/pavilions/{id}` | Update pavilion (name, color, position, size). |
| `DELETE` | `/pavilions/{id}` | Delete pavilion. Fails if pavilion has booths with status != `available`. |

### 3.3 Booths

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/booths` | Create booth(s). Supports single or batch (row generator). |
| `PATCH` | `/booths/{id}` | Update single booth properties. |
| `PATCH` | `/booths/bulk` | Bulk update. Body: `{ booth_ids: [], updates: { pavilion_id?, status?, pricing_tier? } }` |
| `DELETE` | `/booths/{id}` | Delete booth. Fails if status is `sold` or `reserved` (admin must clear first). |
| `GET` | `/booths/search?q=` | Search by exhibitor name or booth number. Returns matching booths. |

### 3.4 Request/Response Shapes

**GET `/floor-plan`** response:

```json
{
  "background": {
    "image_url": "https://cdn.conventioneer.com/...",
    "image_width_px": 3200,
    "image_height_px": 2400
  },
  "pavilions": [
    {
      "id": "uuid",
      "name": "Amber Pavilion",
      "color": "#F59E0B",
      "map_x": 45.2,
      "map_y": 30.1,
      "map_width": 22.5,
      "map_height": 18.0
    }
  ],
  "booths": [
    {
      "id": "uuid",
      "booth_number": "A101",
      "pavilion_id": "uuid",
      "width_ft": 10,
      "depth_ft": 10,
      "sqft": 100,
      "map_x": 46.0,
      "map_y": 31.0,
      "map_width": 3.2,
      "map_height": 3.2,
      "booth_type": "inline",
      "pricing_tier": "standard",
      "base_price": 3500.00,
      "status": "sold",
      "exhibitor": {
        "id": "uuid",
        "company_name": "Nativa Gems",
        "logo_url": "https://..."
      }
    }
  ]
}
```

**POST `/booths`** — row generator batch:

```json
{
  "batch": true,
  "pavilion_id": "uuid",
  "prefix": "A",
  "start_number": 101,
  "count": 12,
  "width_ft": 10,
  "depth_ft": 10,
  "columns": 4,
  "booth_type": "inline",
  "pricing_tier": "standard",
  "base_price": 3500.00,
  "start_map_x": 46.0,
  "start_map_y": 31.0,
  "booth_map_width": 3.2,
  "booth_map_height": 3.2,
  "gap_x": 0.1,
  "gap_y": 0.1
}
```

Returns: array of created booths with auto-calculated `grid_row`, `grid_col`, and map positions.

### 3.5 Auto-Save & Locking

**PUT `/floor-plan`** accepts the full state (all pavilion positions + all booth positions) as a single JSON payload. The frontend debounces saves to 5 seconds after the last change.

Optimistic locking via `updated_at`:
- Client sends `{ updated_at: "2026-03-31T12:00:00Z", pavilions: [...], booths: [...] }`
- Server checks: if any record's `updated_at` is newer than the client's value, respond `409 Conflict` with the conflicting records.
- Client shows: "Someone else made changes. Reload to see their edits, or force-save to overwrite."

### 3.6 Hold Expiration

A background task (FastAPI cron or pg_cron) runs every minute:

```sql
UPDATE tenant.booths
SET status = 'available', hold_expires_at = NULL
WHERE status = 'held' AND hold_expires_at < NOW();
```

---

## 4. Frontend Architecture

### 4.1 Component Tree

```
FloorPlanModule/
├── FloorPlanEditor/            (admin only)
│   ├── EditorToolbar           (upload bg, add pavilion, add row, save, clone)
│   ├── ZoomPanContainer        (react-zoom-pan-pinch wrapper)
│   │   ├── BackgroundImage     (<img> tag)
│   │   ├── PavilionOverlay[]   (draggable/resizable colored divs)
│   │   └── BoothRect[]         (draggable colored divs inside pavilions)
│   ├── PropertiesPanel         (selected booth/pavilion editor form)
│   └── RowGeneratorDialog      (modal: configure batch booth creation)
│
├── FloorPlanViewer/            (public, exhibitor portal, mobile)
│   ├── ViewerSearchBar         (search exhibitor name or booth number)
│   ├── PavilionFilter          (checkbox list with color swatches)
│   ├── ZoomPanContainer        (same wrapper, read-only interaction)
│   │   ├── BackgroundImage
│   │   ├── PavilionOverlay[]
│   │   └── BoothRect[]         (clickable, hover tooltip)
│   ├── BoothDetailPanel        (slide-in right panel / mobile bottom sheet)
│   └── Legend                  (pavilion color key + status key)
│
└── shared/
    ├── ZoomPanContainer        (react-zoom-pan-pinch config)
    ├── BoothRect               (colored div, conditional interactivity)
    ├── PavilionOverlay         (colored semi-transparent div)
    ├── useFloorPlan()          (React Query hook: fetch + cache floor plan data)
    └── useFloorPlanMutations() (React Query mutations: save, create, update, delete)
```

### 4.2 Key Dependencies

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `react-zoom-pan-pinch` | ^3.x | Zoom, pan, pinch-to-zoom on the floor plan container | ~8 KB |
| `@dnd-kit/core` | ^6.x | Drag booths and pavilions to reposition | ~15 KB |
| `html2canvas` | ^1.x | Client-side PNG export (screenshot the viewer div) | ~40 KB |
| `jspdf` | ^2.x | Wrap PNG in a PDF with title/legend | ~90 KB |
| `@tanstack/react-query` | ^5.x | Data fetching, caching, mutations | Already in stack |

No Konva.js. No Fabric.js. No Leaflet. No PostGIS.

### 4.3 State Management

Local React state + React Query. No Zustand needed for this module.

```typescript
// Editor state (local to FloorPlanEditor)
interface EditorState {
  selectedBoothIds: Set<string>;
  selectedPavilionId: string | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

// Floor plan data (from React Query cache)
interface FloorPlanData {
  background: {
    image_url: string;
    image_width_px: number;
    image_height_px: number;
  };
  pavilions: Pavilion[];
  booths: Booth[];
}

interface Pavilion {
  id: string;
  name: string;
  color: string;
  hall_id?: string;
  description?: string;
  map_x: number;  // % of background image
  map_y: number;
  map_width: number;
  map_height: number;
  sort_order: number;
}

interface Booth {
  id: string;
  booth_number: string;
  pavilion_id: string;
  width_ft: number;
  depth_ft: number;
  sqft: number;
  map_x: number;
  map_y: number;
  map_width: number;
  map_height: number;
  rotation: number;
  booth_type: 'inline' | 'corner' | 'island' | 'end_cap' | 'outdoor';
  pricing_tier: 'standard' | 'premium' | 'super_premium' | 'economy';
  base_price: number | null;
  corner_premium: number;
  status: 'available' | 'held' | 'reserved' | 'sold' | 'blocked' | 'not_for_sale';
  assigned_exhibitor_id: string | null;
  exhibitor?: {
    id: string;
    company_name: string;
    logo_url?: string;
  };
  hold_expires_at: string | null;
  grid_row?: number;
  grid_col?: number;
  notes?: string;
  custom_fields: Record<string, unknown>;
}
```

### 4.4 Booth Rendering

Each booth is an absolutely-positioned `<div>` styled by status and pavilion color:

```tsx
function BoothRect({ booth, pavilion, selected, highlighted, onClick, editable }: BoothRectProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${booth.map_x}%`,
    top: `${booth.map_y}%`,
    width: `${booth.map_width}%`,
    height: `${booth.map_height}%`,
    transform: booth.rotation ? `rotate(${booth.rotation}deg)` : undefined,
    backgroundColor: getBoothColor(booth, pavilion),
    border: selected ? '2px solid #2563EB' : '1px solid rgba(0,0,0,0.3)',
    borderRadius: '2px',
    cursor: editable ? 'move' : 'pointer',
    opacity: highlighted === false ? 0.2 : 1,  // dimmed when filtered out
    fontSize: 'clamp(6px, 0.8vw, 11px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
  };

  return (
    <div style={style} onClick={onClick} title={getTooltip(booth)}>
      <span>{booth.booth_number}</span>
    </div>
  );
}

function getBoothColor(booth: Booth, pavilion: Pavilion): string {
  switch (booth.status) {
    case 'available': return '#F3F4F6';       // light gray
    case 'held':      return '#FEF3C7';       // yellow tint
    case 'reserved':  return '#FED7AA';       // orange tint
    case 'sold':      return pavilion.color;  // pavilion color
    case 'blocked':   return '#6B7280';       // dark gray
    case 'not_for_sale': return '#9CA3AF';    // medium gray
    default:          return '#F3F4F6';
  }
}
```

### 4.5 Editor Interactions

**Drag to reposition (booth or pavilion):**
- Use `@dnd-kit/core` with a percentage-based coordinate system.
- On drag end: update `map_x`, `map_y` in local state, set `isDirty = true`.
- Auto-save fires 5s after last change.

**Resize:**
- Four corner handles (small squares) on selected booth/pavilion.
- Drag handle → update `map_width`/`map_height` proportionally.
- ~50 lines of pointer event handling code. No library needed.

**Multi-select:**
- `Shift+click` adds to `selectedBoothIds`.
- When multiple selected, PropertiesPanel shows bulk-edit form (pavilion, status, pricing tier).

**Row generator:**
- Modal dialog: pavilion, prefix, start number, count, columns, booth size, price.
- On submit: `POST /booths` with `batch: true`.
- Response adds all new booths to the React Query cache.

**Clone from previous show:**
- Dropdown: select source show.
- `POST /floor-plan/clone` with `{ source_show_id }`.
- Server copies background, pavilions, booths. Clears exhibitor assignments, resets statuses.
- Client reloads floor plan data.

### 4.6 Viewer Interactions

**Search:**
- Text input filters booths client-side by `booth_number` or `exhibitor.company_name`.
- Matching booths get `highlighted = true`, non-matching get `highlighted = false` (dimmed to 20% opacity).
- If one match: auto-zoom to that booth using `react-zoom-pan-pinch` API.

**Pavilion filter:**
- Checkbox list with color swatches.
- Unchecked pavilions → their booths render at 20% opacity.

**Booth click:**
- Sets `selectedBooth` state.
- Detail panel slides in from right (desktop) or up from bottom (mobile).
- Shows: exhibitor info, booth size, price, status, "Reserve This Booth" CTA (links to M6 booking flow).

**Zoom/Pan:**
- `react-zoom-pan-pinch` handles scroll-wheel zoom, pinch-to-zoom, drag-to-pan.
- Min zoom: fit entire image. Max zoom: 5x.
- "Fit to screen" button resets to min zoom.

### 4.7 Mobile Layout

The viewer uses responsive CSS. No separate mobile app needed for floor plan viewing.

```
< 768px (mobile):
  - Search bar at top (full width)
  - Filter button opens a slide-over panel
  - Floor plan is full-screen with touch zoom/pan
  - Booth detail is a bottom sheet (swipe up to expand, swipe down to dismiss)
  - Legend collapses into a toggle button

≥ 768px (tablet/desktop):
  - Search bar + filter in top bar
  - Floor plan takes ~70% width
  - Detail panel is a right sidebar (~30% width)
  - Legend is a horizontal bar at the bottom
```

### 4.8 Export

| Format | Implementation | Lines of code |
|--------|---------------|---------------|
| PNG | `html2canvas(viewerDiv, { scale: 2 })` → `canvas.toBlob()` → download | ~10 |
| PDF | `html2canvas` → `jsPDF.addImage()` with show name + date header | ~25 |
| Print | CSS `@media print` stylesheet. Hide UI chrome, full-bleed floor plan. | ~30 (CSS) |

No server-side rendering. No Puppeteer. No tile generation.

---

## 5. Backend Implementation

### 5.1 FastAPI Router

```
app/api/v1/
└── floor_plan/
    ├── router.py          # All 12 endpoints
    ├── schemas.py         # Pydantic request/response models
    ├── service.py         # Business logic (clone, row generator, hold expiry)
    └── models.py          # SQLAlchemy models (3 tables)
```

### 5.2 Key Backend Logic

**Row generator** (`POST /booths` with `batch: true`):

```python
def generate_booth_row(params: RowGeneratorParams, show_id: UUID) -> list[Booth]:
    booths = []
    for i in range(params.count):
        row = i // params.columns
        col = i % params.columns
        booths.append(Booth(
            show_id=show_id,
            pavilion_id=params.pavilion_id,
            booth_number=f"{params.prefix}{params.start_number + i}",
            width_ft=params.width_ft,
            depth_ft=params.depth_ft,
            booth_type=params.booth_type,
            pricing_tier=params.pricing_tier,
            base_price=params.base_price,
            grid_row=row,
            grid_col=col,
            map_x=params.start_map_x + col * (params.booth_map_width + params.gap_x),
            map_y=params.start_map_y + row * (params.booth_map_height + params.gap_y),
            map_width=params.booth_map_width,
            map_height=params.booth_map_height,
        ))
    return booths
```

**Clone floor plan** (`POST /floor-plan/clone`):

```python
def clone_floor_plan(source_show_id: UUID, target_show_id: UUID, org_id: UUID):
    # 1. Copy background
    source_bg = db.query(FloorPlanBackground).filter_by(show_id=source_show_id).first()
    if source_bg:
        new_bg = FloorPlanBackground(
            show_id=target_show_id, org_id=org_id,
            image_url=source_bg.image_url,  # reuse same image file
            image_width_px=source_bg.image_width_px,
            image_height_px=source_bg.image_height_px,
        )
        db.add(new_bg)

    # 2. Copy pavilions (map old IDs to new IDs for booth FK)
    pavilion_id_map = {}
    for pav in db.query(Pavilion).filter_by(show_id=source_show_id).all():
        new_pav = Pavilion(
            show_id=target_show_id, org_id=org_id,
            hall_id=pav.hall_id, name=pav.name, color=pav.color,
            description=pav.description,
            map_x=pav.map_x, map_y=pav.map_y,
            map_width=pav.map_width, map_height=pav.map_height,
            sort_order=pav.sort_order,
        )
        db.add(new_pav)
        db.flush()
        pavilion_id_map[pav.id] = new_pav.id

    # 3. Copy booths — reset status, clear exhibitor
    for booth in db.query(Booth).filter_by(show_id=source_show_id).all():
        new_booth = Booth(
            show_id=target_show_id, org_id=org_id,
            pavilion_id=pavilion_id_map[booth.pavilion_id],
            booth_number=booth.booth_number,
            width_ft=booth.width_ft, depth_ft=booth.depth_ft,
            map_x=booth.map_x, map_y=booth.map_y,
            map_width=booth.map_width, map_height=booth.map_height,
            rotation=booth.rotation,
            booth_type=booth.booth_type,
            pricing_tier=booth.pricing_tier,
            base_price=booth.base_price,
            corner_premium=booth.corner_premium,
            status='available',          # reset
            assigned_exhibitor_id=None,  # clear
            grid_row=booth.grid_row, grid_col=booth.grid_col,
            sort_order=booth.sort_order,
        )
        db.add(new_booth)

    db.commit()
```

**Optimistic locking** (in `PUT /floor-plan`):

```python
def save_floor_plan(show_id: UUID, payload: FloorPlanSavePayload):
    # Check for conflicts
    for booth_update in payload.booths:
        existing = db.query(Booth).get(booth_update.id)
        if existing and existing.updated_at > payload.client_updated_at:
            raise HTTPException(409, detail={
                "conflict": "booth",
                "booth_id": str(existing.id),
                "booth_number": existing.booth_number,
                "server_updated_at": existing.updated_at.isoformat(),
            })

    # Apply all updates in a transaction
    for pav_update in payload.pavilions:
        db.query(Pavilion).filter_by(id=pav_update.id).update(pav_update.dict(exclude_unset=True))

    for booth_update in payload.booths:
        db.query(Booth).filter_by(id=booth_update.id).update(booth_update.dict(exclude_unset=True))

    db.commit()
```

### 5.3 Image Upload

Background images are uploaded to S3 (or compatible object storage) via a presigned URL flow:

1. Client calls `POST /floor-plan/background` with file metadata (name, size, type).
2. Server generates a presigned S3 PUT URL, returns it + the final CDN URL.
3. Client uploads directly to S3.
4. Server saves the CDN URL in `floor_plan_backgrounds`.

Max file size: 20 MB. Accepted types: `image/png`, `image/jpeg`, `application/pdf` (first page rasterized server-side via `pdf2image` or `Pillow`).

---

## 6. Integration with Other Modules

| Module | Integration | How |
|--------|-------------|-----|
| **M6 Booth Sales** | Exhibitor clicks "Reserve" on viewer → triggers M6 booking flow. M6 calls `PATCH /booths/{id}` to update status to `held` → `reserved` → `sold`. | M6 writes booth status via API. Viewer re-fetches on focus/interval. |
| **M5 Exhibitor CRM** | Booth assignment links to exhibitor record via FK. CRM shows "Booth: A101 at JOGS Winter 2027". | FK `assigned_exhibitor_id` + join query. |
| **M10 Exhibitor Portal** | Portal embeds `<FloorPlanViewer>` with the exhibitor's booth pre-highlighted and zoomed. | Viewer component accepts `highlightBoothId` prop. |
| **M11 Promoter Dashboard** | Dashboard embeds viewer with sales-status color overlay (green=available, blue=sold, yellow=held). | Viewer component accepts `colorMode="sales_status"` prop. |
| **M18 Public Website** | Public floor plan with exhibitor directory. Booth click → exhibitor profile page. | Viewer component embedded in show page via Next.js dynamic import. |

The viewer does **not** need real-time push updates. It re-fetches data:
- On component mount
- On window focus (React Query `refetchOnWindowFocus`)
- Every 60 seconds (React Query `refetchInterval` for the viewer on pages where booth availability matters)

---

## 7. Performance Considerations

| Metric | Target | Approach |
|--------|--------|----------|
| Initial load (viewer) | < 1s | Single API call returns all data. Background image via CDN. |
| Initial load (editor) | < 1.5s | Same + editor UI initialization. |
| 500 booth divs render | < 200ms | Plain HTML divs. No canvas overhead. React virtualizes nothing — 500 divs is trivial. |
| Booth click response | < 50ms | Local state update, no API call. |
| Zoom/pan | 60 FPS | CSS transform handled by GPU. `react-zoom-pan-pinch` uses `transform: scale() translate()`. |
| Auto-save payload | < 100 KB | JSON of 500 booths + 20 pavilions. Gzip'd by default. |
| Search/filter | < 50ms | Client-side string matching on cached data. |

### Image optimization
- Background images are resized server-side on upload: max 4000px on longest edge.
- Served via CDN with aggressive cache headers.
- `<img loading="lazy">` not needed — the background is always visible.

---

## 8. Testing Strategy

### Unit Tests (pytest)
- Row generator: correct count, numbering, positioning, edge cases (0 columns, 1 booth).
- Clone: pavilion/booth copy correctness, status reset, exhibitor clearing.
- Hold expiry: booths past `hold_expires_at` revert to `available`.
- Optimistic locking: conflict detection returns 409 with correct detail.

### API Tests (pytest + httpx)
- Full CRUD cycle: create background → create pavilion → create booths → update → delete.
- Bulk update: select multiple booths, assign pavilion, verify all updated.
- Search: by booth number, by exhibitor name, partial match, no match.
- Clone: source show intact, target show has copies, no shared references.
- Auth: admin-only endpoints reject non-admin tokens.

### Frontend Tests (Vitest + React Testing Library)
- Editor: add pavilion → renders on canvas. Add row of booths → renders inside pavilion.
- Editor: click booth → properties panel shows. Edit field → dirty flag set.
- Viewer: search filters booths. Pavilion filter dims non-matching.
- Viewer: click booth → detail panel opens with correct data.
- Export: `html2canvas` called with correct element ref.

### E2E Tests (Playwright)
- Editor: upload background → add pavilion → generate booth row → save → reload → verify persisted.
- Viewer: load floor plan → search for exhibitor → verify booth highlighted → click → verify detail panel.
- Mobile: pinch-to-zoom works. Bottom sheet appears on booth tap.
- Integration: reserve booth in viewer → status updates to held → verify color changes.

---

## 9. Build Plan (5 Weeks)

### Week 1 — Data + API + Basic Viewer
**Backend:**
- Create DB tables (migrations)
- Implement all 12 API endpoints
- S3 presigned URL image upload
- Row generator logic

**Frontend:**
- `FloorPlanViewer` component: background image + booth divs + zoom/pan
- `useFloorPlan()` hook with React Query
- Basic booth click → detail panel

### Week 2 — Editor Core
**Frontend:**
- `FloorPlanEditor` component: toolbar, background upload, add pavilion (draggable/resizable overlay)
- Row generator dialog + batch booth creation
- Click-to-select booth → properties panel (bottom form)
- Drag-to-reposition booths (using `@dnd-kit`)
- Auto-save (debounced 5s)

### Week 3 — Editor Polish + Clone
**Frontend:**
- Multi-select (Shift+click) + bulk edit form
- Resize booth handles
- Clone from previous show (dropdown + confirmation)

**Backend:**
- Clone endpoint logic
- Optimistic locking on save
- Hold expiry background task

### Week 4 — Viewer Features + Mobile
**Frontend:**
- Viewer: search bar with auto-zoom to match
- Viewer: pavilion filter with color swatches
- Viewer: legend component
- Responsive mobile layout (bottom sheet, touch targets)
- Export: PNG via `html2canvas`, PDF via `jsPDF`, print stylesheet

### Week 5 — Integration + Testing
- Wire up M6 booth sales: "Reserve" CTA triggers booking flow
- Embed viewer in M10 exhibitor portal (with `highlightBoothId`)
- Embed viewer in M11 dashboard (with `colorMode="sales_status"`)
- Write test suite (unit, API, frontend, E2E)
- Performance testing with 500 booths
- Bug fixes and polish

---

## 10. What's Explicitly Out of Scope

| Feature | Reason | Revisit When |
|---------|--------|--------------|
| PostGIS / spatial queries | Booths are rectangles at known positions. `pavilion_id` + `grid_row/col` is sufficient. | A client needs irregular geometry. |
| Konva.js / canvas rendering | HTML divs on an image is simpler, faster to build, and performs fine at 500 booths. | 2000+ booths or non-rectangular shapes. |
| CAD import (DWG/DXF) | Venues already have PNG/PDF floor plans. Nobody will hand us a DWG. | A venue partner explicitly requests it. |
| Real-time collaboration (WebSocket) | One admin edits at a time. Auto-save + optimistic locking handles the rare conflict. | Multiple admins routinely collide (validate with usage data). |
| Undo/redo command pattern | Browser undo on form fields + "revert to last save" covers the use case. | Users request it after launch. |
| Version history + visual diff | Clone-from-previous-show is the versioning mechanism. | Promoters need to compare layouts side-by-side. |
| Tile-based mobile rendering | CSS zoom on 500 divs works fine on modern phones. | Floor plan has 2000+ booths or targets low-end devices. |
| A* pathfinding / wayfinding | "Go to North Hall" is sufficient for a 4-hall venue. | Venue is large enough that people genuinely get lost. |
| Server-side PNG/PDF export | Client-side `html2canvas` + `jsPDF` works. No Puppeteer. | Export quality is insufficient (unlikely). |
| Polygon/irregular booth shapes | Every JOGS booth is a rectangle. | A client has L-shaped or non-rectangular booths. |

---

*This spec should be reviewed by the tech lead before Week 1 begins. It supersedes the overengineered spec (`conventioneer-floor-plan-overenginered-spec.md`) and aligns with the Goldilocks approach documented in `conventioneer-floor-plan-Goldielocks.md`.*
