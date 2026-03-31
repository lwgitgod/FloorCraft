# Ticket 4 — Toolbar + Pavilion Legend

**Status:** COMPLETE
**Date completed:** 2026-03-31

## Objective

Replace the minimal single-row toolbar with a full two-row toolbar featuring: show name, venue name, a color mode toggle (Pavilion vs Status), a dynamic legend that switches between pavilion colors and status colors, and summary statistics computed from live booth data.

## Approach

1. **Extracted shared utilities** — Moved `getBoothFill`, `STATUS_COLORS`, and `ColorMode` type into `src/utils/boothColors.ts` so both the component and tests can import without JSX parsing issues.

2. **Expanded toolbar to two rows (96px)** — Row 1 shows the show name, venue name, color mode toggle button, and zoom info. Row 2 shows the dynamic legend and booth stats.

3. **Color mode toggle** — A `colorMode` state (`"pavilion" | "status"`) drives both the legend display and booth fill colors. In pavilion mode, booths are colored by their pavilion with full pavilion names in the legend. In status mode, booths use green/red/yellow/gray with status labels.

4. **Dynamic stats** — A `boothStats` useMemo computes sold/available/held/blocked counts from `activeBooths`, displayed as "94 booths — 56 sold, 19 available, 10 held, 9 blocked" (or whatever the actual data produces).

5. **Updated `getBoothFill`** — Now accepts an optional `colorMode` parameter. In `"status"` mode it returns the STATUS_COLORS value for the booth's status; in `"pavilion"` mode it returns the pavilion color (with blocked override).

## Output

| Item | Path |
|------|------|
| Shared color utilities | `conventioneer-demo/src/utils/boothColors.ts` |
| Modified component | `conventioneer-demo/src/components/FloorPlanEditor.tsx` |
| Test file | `conventioneer-demo/src/tests/ticket4.test.ts` |

## Test Results

```
Test Suites: 4 passed, 4 total
Tests:       60 passed, 60 total
```

Ticket 4 tests (8 tests):
1. mockData has all 6 pavilions with colors and codes
2. All pavilion names are present for the legend
3. STATUS_COLORS has all 4 status colors
4. getBoothFill returns pavilion color in pavilion mode
5. getBoothFill returns status color in status mode for all statuses
6. getBoothFill returns blocked color for blocked booths in pavilion mode
7. Booth status counts are computed correctly from mock data
8. Stats math adds up: total = sold + available + held + blocked

All existing tests (tickets 0, 2, 3) continue to pass.

## Technical Notes

- TOOLBAR_HEIGHT increased from 48px to 96px; the resize handler and properties panel offset already reference this constant so they adjust automatically.
- The `getBoothFill` function defaults to `"pavilion"` mode for backward compatibility.
- Legend shows full pavilion names (e.g., "International Gemstone Pavilion") instead of short codes for better readability.
- The toggle button uses the dark theme styling consistent with the rest of the UI (#252544 background, #3a3a66 border).
- Stats are dynamically computed via useMemo from activeBooths, not hardcoded.
