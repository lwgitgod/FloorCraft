# Ticket 7 — Add Row of Booths (Row Generator)

**Status:** COMPLETE
**Date completed:** 2026-03-31

## Objective

Add a Row Generator feature to the floor plan editor that allows staff to quickly create a row of evenly-spaced booths with configurable dimensions, numbering, and direction, placed via a click-to-position workflow.

## Approach

1. **Row Generator Modal** — Added an "Add Booth Row" button to the toolbar (Row 1, next to color mode toggle). Clicking it opens a dark-themed modal overlay with form fields for: number of booths, booth width/depth (ft), aisle gap after row (ft), number prefix, starting number, and direction (horizontal/vertical). A live preview line shows the label range (e.g. "T01 – T08 (8 booths, 10×10 ft each)").

2. **Placement Mode** — Clicking "Place Row" in the modal freezes the config into a `placingRow` state and closes the modal. The cursor changes to crosshair via a `useEffect` on `document.body.style.cursor`. The toolbar button highlights blue and an inline hint reads "Click on canvas to place row" with a Cancel link.

3. **Click-to-Place Logic** (`handlePlaceRow` callback) — When the canvas is clicked in placement mode:
   - Converts screen pointer coordinates to venue feet: `(pointer - position) / scale / FT_TO_PX`
   - Snaps to nearest 10ft grid point
   - Loops through active halls to find which hall contains the snapped position
   - If outside all halls, cancels placement silently
   - Generates N booth objects with: unique IDs (`booth-NEW-{timestamp}-{index}`), auto-numbered labels (prefix + zero-padded number), `pavilionId: ""` (unassigned, renders gray), `status: "available"`, `boothType: "inline"`, price = width × depth × $35/sqft
   - For horizontal: booths placed side by side along X axis
   - For vertical: booths stacked along Y axis
   - Appends to `booths` state and clears placement mode

4. **Modified Stage Click Handler** — `handleStageClick` now checks `placingRow` first; if active, delegates to `handlePlaceRow` instead of the deselect logic.

## Output

| Item | Path |
|------|------|
| Modified component | `conventioneer-demo/src/components/FloorPlanEditor.tsx` |
| Test file | `conventioneer-demo/src/tests/ticket7.test.ts` |

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Time:        0.536 s
```

### Tests Covering:

| # | Test | Result |
|---|------|--------|
| 1 | Generates correct number of booths | PASS |
| 2 | Auto-numbers booths with prefix and zero-padded numbers (T01–T08) | PASS |
| 3 | All generated booths are available and unassigned | PASS |
| 4 | Booths have correct dimensions and price ($3,500 for 10×10) | PASS |
| 5 | Booths have unique IDs | PASS |
| 6 | Booths are assigned to the correct hall and show | PASS |
| 7 | Horizontal row: booths placed side by side along X axis | PASS |
| 8 | Vertical row: booths stacked along Y axis | PASS |
| 9 | Click position snaps to nearest grid point | PASS |
| 10 | Exact grid position stays unchanged | PASS |
| 11 | Clicking inside West Hall assigns booths to hall-west | PASS |
| 12 | Clicking outside all halls returns null | PASS |
| 13 | Clicking far outside venue returns null | PASS |
| 14 | Custom prefix and starting number (N101–N104) | PASS |
| 15 | Larger booth sizes produce correct dimensions and pricing | PASS |
| 16 | Single booth row works correctly | PASS |
| 17 | No ID conflicts with existing mock data booths | PASS |
| 18 | Unassigned pavilion renders fallback color (#666) | PASS |

## Acceptance Criteria Verification

- [x] Toolbar has "Add Booth Row" button
- [x] Button opens a modal with all required fields (count, width, depth, aisle gap, prefix, start number, direction)
- [x] "Place Row" activates crosshair cursor and placement mode
- [x] Clicking canvas generates booths at that position, snapped to grid
- [x] Booths auto-numbered (e.g. T01–T08) with configurable prefix
- [x] All new booths are status=available, unassigned pavilion (gray), type=inline
- [x] Horizontal and vertical directions both work
- [x] New booths are draggable and selectable like any other booth (they use the same `booths` state array)
- [x] Cancel link and click-outside-modal dismiss the workflow
