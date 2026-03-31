# Ticket 9: Delete Booth(s)

## Description
Select one or more booths. Press the Delete key or click "Delete" in the properties panel. If any selected booth has status "sold," show a confirmation dialog: "X of Y selected booths are sold. Delete anyway?" Otherwise delete immediately.

## What Was Implemented

### FloorPlanEditor.tsx Changes

1. **Delete state management** -- Added `deleteConfirmOpen` and `deleteConfirmInfo` state for the confirmation modal.

2. **`handleDeleteBooths` callback** -- Checks if any selected booths are sold. If yes, opens a confirmation dialog with sold/total counts. If no sold booths, deletes immediately by filtering them from the booths array and clears selection.

3. **`handleConfirmDelete` / `handleCancelDelete`** -- Confirm proceeds with deletion and clears selection. Cancel closes the modal without changes.

4. **Delete key keyboard listener** -- `useEffect` with `keydown` event handler for the Delete key. Skips when focus is on INPUT/TEXTAREA/SELECT elements to avoid interfering with text editing.

5. **Confirmation dialog modal** -- Styled consistently with the row generator modal (dark theme, fixed overlay, centered card). Shows sold booth count and total, with Cancel and Delete buttons.

6. **Delete button in PropertiesPanel** -- Red "Delete Booth" / "Delete N Booths" button added to both single-select and multi-select views. Added `onDeleteBooths` prop to the PropertiesPanel interface.

### Data Test IDs
- `delete-booth-btn` -- Delete button in properties panel
- `delete-confirm-modal` -- Confirmation dialog overlay
- `delete-confirm-btn` -- Confirm delete button
- `delete-cancel-btn` -- Cancel button in confirmation dialog

## Test Results

**26 tests, 26 passed, 0 failed**

```
Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
```

Test categories:
- Deleting available booths (3 tests)
- Sold booth detection (4 tests)
- Confirmation requirement (6 tests)
- Empty selection handling (2 tests)
- Booth count after deletion (4 tests)
- Works with real mock data (2 tests)
- data-testid string verification (5 tests)

## Notes
- Uses a React state-driven modal instead of `window.confirm` to avoid blocking browser events in the canvas app.
- The Delete key handler guards against firing when the user is typing in form inputs.
- The confirmation dialog message dynamically adjusts grammar ("is"/"are") based on sold count.
