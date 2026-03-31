# Ticket 14: Undo / Redo

## Status: COMPLETE

## What Was Done

Implemented full undo/redo support for the Conventioneer Floor Plan Editor.

### Changes to `FloorPlanEditor.tsx`:

1. **Undo/Redo state infrastructure** (after booth state initialization):
   - `undoStackRef` and `redoStackRef` as `useRef<Booth[][]>` to avoid re-renders from stack changes
   - `canUndo` / `canRedo` boolean state to drive button disabled/enabled appearance
   - `boothsRef` to provide synchronous access to current booths from the wrapper
   - `MAX_UNDO = 20` constant limiting history depth

2. **`setBoothsWithHistory` wrapper function**:
   - Snapshots current `boothsRef.current` onto undoStack (capped at 20)
   - Clears redoStack (new mutation invalidates forward history)
   - Updates `canUndo`/`canRedo` state
   - Delegates to raw `setBooths` for the actual state update

3. **`undo()` and `redo()` functions**:
   - `undo()`: pops last entry from undoStack, pushes current state onto redoStack, sets booths
   - `redo()`: pops last entry from redoStack, pushes current state onto undoStack, sets booths

4. **All 10 `setBooths` call sites replaced** with `setBoothsWithHistory`:
   - Row placement (line ~799)
   - Single booth placement (line ~889)
   - `handleUpdateBooth` (line ~949)
   - `handleBulkUpdate` (line ~959)
   - `handleDeleteBooths` direct delete (line ~991)
   - `handleConfirmDelete` confirmed delete (line ~999)
   - Auto-number apply (line ~1074)
   - Context menu: duplicate booth (line ~1193)
   - Context menu: delete booth (line ~1230)
   - Context menu: add booth here (line ~1266)

5. **Keyboard shortcuts** (new `useEffect`):
   - `Ctrl+Z` triggers `undo()`
   - `Ctrl+Shift+Z` triggers `redo()`
   - Skipped when focus is in INPUT/TEXTAREA/SELECT elements
   - Both `ctrlKey` and `metaKey` supported (Windows + Mac)

6. **Toolbar buttons**:
   - Undo and Redo buttons added to toolbar row 1, before the "Color by" toggle
   - Buttons are grayed out (opacity 0.5, color #555, cursor: default) when nothing to undo/redo
   - `data-testid="undo-btn"` and `data-testid="redo-btn"`
   - Title attributes show keyboard shortcut hints

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
Time:        0.553 s
```

### Test Coverage (21 tests):
- **Basic undo** (3 tests): single undo, empty stack, multiple undos
- **Basic redo** (3 tests): single redo, empty stack, incremental redo
- **Redo clearing** (1 test): new mutation after undo clears redo stack
- **Max stack depth** (2 tests): capped at 20, oldest state dropped
- **Move + undo + redo cycle** (1 test): move, undo returns it, redo moves again
- **Acceptance criteria** (1 test): add 3 booths, undo 3 (all gone), redo 2 (2 come back)
- **Delete + undo** (1 test): delete booth, undo brings it back
- **Property change + undo** (1 test): change status, undo restores original
- **Real mock data** (1 test): snapshot/restore works with actual mockData.booths
- **data-testid verification** (7 tests): buttons, keyboard handler, wrapper usage, refs, MAX_UNDO, disabled state

## Acceptance Criteria Met

- [x] Move a booth. Ctrl+Z -> it goes back. Ctrl+Shift+Z -> it moves again.
- [x] Add 3 booths, undo 3 times, all 3 disappear. Redo twice, 2 come back.
- [x] Undo/redo buttons in toolbar, grayed out when nothing to undo/redo.

## Files Modified
- `conventioneer-demo/src/components/FloorPlanEditor.tsx` -- undo/redo system + toolbar buttons + keyboard shortcuts
- `conventioneer-demo/src/tests/ticket14.test.ts` -- 21 pure logic tests (new file)
