# Ticket 5: Drag to Reposition Booths

**Status:** COMPLETE
**Date:** 2026-03-31

---

## What Was Implemented

### Single Booth Drag
- Booths are now draggable via the Konva `<Group>` `draggable` prop
- On drag end, the booth position snaps to the nearest 1-foot grid (using `Math.round` on the pixel delta / FT_TO_PX)
- Dragging a booth does not trigger stage panning (`cancelBubble = true` on all drag events)

### Multi-Select Group Drag
- When dragging a booth that is part of a selection, ALL selected booths move together
- Relative positions between selected booths are maintained — delta is calculated once from the dragged booth and applied uniformly to all selected booths
- If you drag an unselected booth, it auto-selects first

### Coordinate Tooltip
- While dragging, a floating tooltip appears near the cursor showing `x: Nft, y: Nft` (hall-local coordinates)
- Tooltip has green border/text (`#4ade80`) to distinguish from the resize tooltip (blue)
- Tooltip disappears on drag end

---

## Files Changed

| File | Change |
|---|---|
| `src/components/FloorPlanEditor.tsx` | Added drag state (`dragTooltip`, `dragStartRef`), three handlers (`handleBoothDragStart`, `handleBoothDragMove`, `handleBoothDragEnd`), made booth `<Group>` draggable, added drag tooltip HTML overlay |
| `src/tests/ticket5.test.ts` | **NEW** — 22 unit tests covering snap-to-grid, coordinate conversion, delta calculation, multi-booth group drag, and end-to-end drag scenario |
| `tickets/Ticket5.md` | **NEW** — This status report |

---

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       22 passed, 22 total
Time:        0.479s
```

### Test Coverage
- `snapToFoot` — 6 tests (exact boundary, above/below rounding, halfway, zero, large values)
- `worldPxToHallLocalFt` — 3 tests (standard conversion, zero at origin, negative values)
- `hallLocalFtToWorldPx` — 3 tests (standard conversion, origin, round-trip)
- `calcDragDeltaFt` — 5 tests (zero, positive, negative, sub-foot snap, halfway snap)
- `applyGroupDragDelta` — 4 tests (single booth, multi-booth relative positions, zero delta, negative coords)
- End-to-end drag scenario — 1 test

---

## Architecture Notes

- **Delta-based approach:** The dragged Konva node is reset to its original position after drag end. The snapped delta (in feet) is then applied to all selected booths via React state (`setBoothsWithHistory`). This keeps React as the single source of truth and integrates with the undo/redo history.
- **Snap granularity:** 1-foot grid (per ticket spec), NOT the 10-foot visual grid. `Math.round(deltaPx / FT_TO_PX)` gives 1-foot snapping.
- **Stage pan conflict:** Resolved by setting `e.cancelBubble = true` on all booth drag events, preventing the stage's drag handler from firing.

---

## Acceptance Criteria Met

- [x] Drag a single booth, it snaps to grid on release
- [x] Select 3 booths, drag one, all 3 move together maintaining relative positions
- [x] Coordinates show while dragging
