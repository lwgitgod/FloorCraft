# Ticket 8: Add Single Booth

## Status: Complete

## What Was Implemented

Added "Add Booth" functionality to the floor plan editor toolbar. Users can now place individual 10x10 booths on the canvas with a single click.

### Changes to `src/components/FloorPlanEditor.tsx`:

1. **New state:** `placingSingleBooth` boolean state (mirrors the `placingRow` pattern).

2. **Toolbar button:** "Add Booth" button with `data-testid="add-booth-btn"`, placed before the existing "Add Booth Row" button. Shows active (blue) state when in placement mode. Activating it cancels any active row placement mode.

3. **Placement hint + cancel:** When in placement mode, a "Click on canvas to place booth" message appears with a Cancel button (`data-testid="cancel-single-booth-btn"`).

4. **`handlePlaceSingleBooth` callback:** Handles the full placement flow:
   - Converts screen pointer to venue feet
   - Snaps to 10ft grid
   - Detects which hall was clicked (cancels if outside all halls)
   - Derives hall prefix from hall name (E/W/N/S/O)
   - Finds highest existing booth number for that hall prefix, increments by 1
   - Creates a 10x10 booth with status="available", boothType="inline", price=$3,500, no pavilion
   - Adds booth to state, selects it (opens properties panel), exits placement mode

5. **`handleStageClick` updated:** Now checks `placingSingleBooth` after the `placingRow` check.

6. **Cursor useEffect updated:** Crosshair cursor activates for both `placingRow` and `placingSingleBooth`.

7. **Mutual exclusion:** Clicking "Add Booth" cancels row placement mode. Clicking "Add Booth Row" cancels single booth placement mode.

## What Was Tested

33 tests in `src/tests/ticket8.test.ts`:

| Category | Tests | Description |
|---|---|---|
| Toolbar button | 2 | Verifies `data-testid` attributes exist in source |
| Default properties | 7 | 10x10 size, available status, inline type, $3500 price, empty pavilion, correct showId, id format |
| Auto-numbering | 6 | Increments from highest existing, starts at 100 for empty hall, correct prefixes (E/W/O), sequential numbering |
| Selection | 2 | New booth id populates selectedIds, id contains timestamp |
| Hall detection | 6 | East/West hall detection, null for outside, correct hallId, boundary behavior |
| Grid snapping | 6 | Exact points, rounding up/down, midpoints, hall-local derivation |
| Coordinate conversion | 4 | Scale, offset, combined transforms |

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       33 passed, 33 total
Time:        0.603 s
```

All tests pass.

## Notes

- The auto-numbering uses a base of 99 (so first booth in an empty hall is 100), matching the mock data convention where booths start at E100, W100, O100.
- Hall prefix derivation is based on hall name string matching (e.g., "East Hall" -> "E"). Falls back to "X" for unrecognized hall names.
- The booth is immediately selected after placement so the properties panel opens, allowing the user to assign a pavilion, change status, etc.
