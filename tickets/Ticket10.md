# Ticket 10: Right-Click Context Menu

**Status:** Complete
**Date:** 2026-03-31

## Summary

Implemented a right-click context menu for the floor plan editor with two variants:

1. **Booth context menu** (right-click a booth): Edit Properties, Duplicate, Change Pavilion (submenu), Set Status (submenu), Auto-Number Selection, Delete
2. **Empty canvas context menu** (right-click empty space): Add Booth Here, Add Booth Row Here, Paste (grayed out placeholder)

## Changes

### `src/components/FloorPlanEditor.tsx`

- Added `contextMenu` state to track menu position, target booth, and venue coordinates
- Added `handleStageContextMenu` and `handleBoothContextMenu` handlers wired to Konva's `onContextMenu` event
- Added action handlers: `handleCtxEditProperties`, `handleCtxDuplicate`, `handleCtxChangePavilion`, `handleCtxSetStatus`, `handleCtxAutoNumber`, `handleCtxDelete`, `handleCtxAddBoothHere`, `handleCtxAddRowHere`
- Added `useEffect` to close context menu on Escape key or click outside
- Added `ContextMenuOverlay` component: HTML overlay (not Konva) with hover-expandable submenus for pavilion and status
- All menu items have `data-testid` attributes per spec

### `src/tests/ticket10.test.ts`

35 tests covering:
- All `data-testid` attributes exist in source (14 tests)
- Duplicate booth logic: new ID, 10ft offset, available status, cleared exhibitor, preserved dimensions/hall/show, sequential number, recalculated price (8 tests)
- Pavilion change logic (2 tests)
- Status change logic (2 tests)
- Add Booth Here: position snapping, hall detection, defaults, null for outside halls, correct prefix (6 tests)
- Context menu type distinction: booth vs empty canvas (3 tests)

## Acceptance Criteria

- [x] Right-click a booth shows booth context menu with all specified items
- [x] Right-click empty space shows canvas context menu
- [x] Change Pavilion submenu lists all pavilions with color swatches
- [x] Set Status submenu lists all 4 statuses with color indicators
- [x] "Add Booth Here" places a 10x10 booth at the right-click position
- [x] Duplicate creates a copy offset 10ft right with available status
- [x] Delete removes the booth (with sold confirmation if applicable)
- [x] Menu dismisses on action, Escape, or click outside
- [x] Native browser context menu is suppressed
- [x] All 35 tests pass

## Design

- Context menu is an HTML `div` with `position: fixed`, overlaid on the canvas
- Submenus expand on hover to the right
- Dark theme consistent with app (#1e1e36 background, #3a3a66 borders, #e0e0e0 text)
- Menu position is clamped to viewport bounds
- Paste option is grayed out as a placeholder for future clipboard support
