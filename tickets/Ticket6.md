# Ticket 6: Resize Booths — Status Report

**Status:** COMPLETE
**Date:** 2026-03-31
**Tests:** 26/26 passing

---

## What Was Implemented

### Resize handles on selected booths
When a booth is selected, 4 small white square handles appear at each corner (TL, TR, BL, BR). Handles are scale-independent — they stay the same visual size regardless of zoom level.

### Drag-to-resize behavior
- Drag any corner handle to resize the booth
- The opposite corner stays anchored (fixed point)
- Dimensions update live during drag
- Width and height snap to 1-foot increments (rounded to nearest integer)
- Minimum 8ft on any side enforced

### Dimension tooltip
An overlay tooltip appears near the cursor during resize showing current dimensions (e.g., "12x15 ft") in monospace font.

### Properties panel updates
The existing properties panel already displays `widthFt x heightFt` and computes square footage from `widthFt * heightFt`. Since resize calls `handleUpdateBooth()` with the new `xFt`, `yFt`, `widthFt`, `heightFt`, the panel updates live during drag — no additional changes needed.

### Cursor feedback
Appropriate resize cursors (`nwse-resize`, `nesw-resize`) appear when hovering over corner handles.

---

## Files Modified

| File | Changes |
|---|---|
| `src/components/FloorPlanEditor.tsx` | Added `MIN_BOOTH_SIZE_FT` and `HANDLE_SIZE` constants; `resizingRef` and `resizeTooltip` state; 3 resize callbacks (`handleResizeDragStart`, `handleResizeDragMove`, `handleResizeDragEnd`); 4 corner handle Rects per selected booth; tooltip HTML overlay |
| `src/tests/ticket6.test.ts` | 26 tests covering anchor computation, resize in all 4 directions, minimum size enforcement, grid snapping, square footage recalculation, all 4 corners, and mock data validation |

---

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
Time:        0.576 s
```

### Test Coverage

| Category | Tests | Status |
|---|---|---|
| Anchor computation (all 4 corners) | 5 | PASS |
| Resize to larger dimensions | 3 | PASS |
| Resize to smaller dimensions | 1 | PASS |
| Minimum size enforcement (8ft) | 4 | PASS |
| Grid snapping (1ft increments) | 2 | PASS |
| Square footage recalculation | 3 | PASS |
| All 4 corners symmetry | 4 | PASS |
| Properties panel data consistency | 1 | PASS |
| Mock data booth validation | 3 | PASS |

---

## Acceptance Criteria Verification

| Criteria | Met? |
|---|---|
| Select a 10x10 booth → 4 corner handles visible | YES |
| Drag handle → booth resizes | YES |
| Minimum 8ft enforced on any side | YES |
| Snaps to 1-foot increments | YES |
| Properties panel shows updated dimensions live | YES |
| Square footage recalculates | YES |

---

## Technical Approach

- **Coordinate math:** Screen pointer → world pixels via `(pointer - stagePos) / scale` → hall-local feet via `worldPx / FT_TO_PX - hallOffset`. This avoids feedback loops from reading Konva node positions during drag.
- **Resize ref vs state:** Used `useRef` for active resize data (booth ID, anchor position) to avoid stale closures in the `onDragMove` handler. Only tooltip visibility uses `useState`.
- **Event isolation:** All handle events use `cancelBubble = true` to prevent triggering booth selection or stage pan.
