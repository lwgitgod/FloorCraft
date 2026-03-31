# Ticket 15: Clone Show Floor Plan

## Status: PASS

## What Was Implemented

### 1. Mock Data (`src/data/mockData.ts`)
- Added `CloneableShow` interface and `cloneableShows` export with two mock shows:
  - **JOGS Winter 2026** — 76 booths (8 cols x 4 rows in East/West halls + 12 outdoor). Uses seed 99.
  - **JOGS Fall 2026** — 136 booths (12 cols x 5 rows in East/West halls + 16 outdoor). Uses seed 77.
- Both have different booth counts from each other and from the current Winter 2027 show (94 booths).
- Reused the existing `BoothLayout` type and `seededRandom`/`pickStatus` helpers via a new `generateCloneBooths()` function.

### 2. FloorPlanEditor (`src/components/FloorPlanEditor.tsx`)
- **Clone From button** in toolbar Row 1, after the color mode toggle, before the zoom span.
- **State variables**: `cloneModalOpen`, `cloneConfirmShow`, `toastMessage`, `toastVisible`.
- **Clone modal** (dark themed, matching row generator modal):
  - Dropdown (`<select>`) listing cloneable shows with booth counts.
  - Confirmation warning: "This will replace all current booths. Continue?"
  - Cancel and Clone buttons. Clone is disabled until a show is selected.
- **Clone handler** (`handleCloneConfirm`):
  - Copies all booths from selected source show.
  - Resets all statuses to "available", clears exhibitor names and notes.
  - Generates new unique IDs with "clone-" prefix.
  - Sets showId to the current active show.
  - Uses `setBoothsWithHistory` for undo support.
- **Toast notification**: Green (#22c55e) fixed-position bar at bottom-center, auto-dismisses after 4 seconds.
- **data-testid attributes**: `clone-from-btn`, `clone-modal`, `clone-show-select`, `clone-confirm-btn`, `clone-cancel-btn`, `clone-toast`.

### 3. Tests (`src/tests/ticket15.test.ts`)
32 pure logic tests covering:
- Clone data structure validation
- Status reset to "available"
- Exhibitor name clearing
- Pavilion assignment preservation
- Booth position preservation
- ID uniqueness (clone- prefix, no collisions with source or current)
- Different booth counts between shows
- Toast message format
- UI element existence in source (data-testid checks)

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
Time:        0.795 s
```

All 32 tests passed on first run.

## Notes
- The clone operation goes through `setBoothsWithHistory`, so it is fully undoable via Ctrl+Z.
- Clicking the modal backdrop or Cancel closes the modal and resets state.
- The select dropdown shows booth counts for each show to help the user decide which to clone.
