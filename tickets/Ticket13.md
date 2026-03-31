# Ticket 13: Pavilion Filter

## Status: COMPLETE

## Summary

Implemented clickable pavilion filter toggles in the legend bar of the Conventioneer floor plan editor. When in pavilion color mode, clicking a pavilion name in the legend filters the view to show only that pavilion's booths at full opacity while dimming all others to 20% opacity. Multiple pavilions can be active simultaneously. A "Show All" button appears when any filter is active, resetting the view to show all booths.

## What Was Implemented

### Clickable Pavilion Legend Items
- Each pavilion in the legend is now a clickable toggle (`data-testid="pavilion-filter-{pavilionId}"`)
- Clicking a pavilion adds it to the active filter set; clicking again removes it
- Active pavilions show a colored border, tinted background, and brighter text
- Smooth CSS transition on hover/toggle state changes
- Cursor changes to pointer on hover

### Show All Button
- A "Show All" button (`data-testid="show-all-btn"`) appears when any pavilion filter is active
- Clicking it resets the filter set to empty, restoring all booths to normal visibility
- Styled with a blue border to stand out from the legend items

### Booth Dimming Logic
- Booths not in any active pavilion filter are dimmed to 0.2 opacity
- Search dimming (0.3 opacity) takes priority over pavilion filtering when both are active
- When no filters are active, all booths render at their normal opacity
- The dimming integrates cleanly with the existing search highlight/dim system

## Files Modified

- `conventioneer-demo/src/components/FloorPlanEditor.tsx` -- Added `activePavilionFilters` state, made legend items clickable toggles, added Show All button, integrated pavilion filter dimming into booth opacity computation

## Files Created

- `conventioneer-demo/src/tests/ticket13.test.ts` -- 27 functional tests covering toggle logic, Show All reset, opacity/dimming computation, combined search+filter behavior, mock data coverage, and UI element existence

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
```

## Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| Click "Amber" in legend -- only amber booths are bright | PASS -- clicking a pavilion adds it to the active filter set, dimming all non-matching booths to 0.2 opacity |
| Click "Silver Jewelry" too -- amber + silver visible | PASS -- multiple pavilions can be active simultaneously, both pavilions' booths stay at full opacity |
| Click "Show All" -- everything visible | PASS -- Show All button clears the filter set, restoring all booths to normal opacity |
