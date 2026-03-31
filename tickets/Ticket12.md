# Ticket 12: Search + Highlight

## Status: COMPLETE

## Summary

Implemented booth search with highlight/dim visual feedback and auto-pan in the Conventioneer floor plan editor. Users can type an exhibitor name or booth number into a search bar in the toolbar, and matching booths receive a pulsing blue glow ring while non-matching booths dim to 30% opacity. The canvas auto-pans and zooms to center on the first match. Clearing the search restores normal view.

## What Was Implemented

### Search Bar (Toolbar)
- Added a search input field (`data-testid="search-input"`) in the toolbar's top row, between the Auto-Number button and the Color Mode toggle
- Placeholder text: "Search booth # or exhibitor..."
- Blue border highlight when search is active
- Clear button (`data-testid="search-clear"`) appears inside the input when a query is present
- Match count indicator (`data-testid="search-result-count"`) shows "N matches" in green or "No matches" in red

### Search Matching Logic
- Case-insensitive substring match against booth number and exhibitor name
- Matches update reactively as the user types
- Empty/whitespace-only queries return zero matches and restore normal view

### Visual Feedback
- **Matching booths**: Pulsing blue glow ring using Konva `shadowColor`/`shadowBlur` with animated opacity via `requestAnimationFrame`. The glow stroke width and opacity oscillate smoothly using a sine wave on `glowPhase`
- **Non-matching booths**: Opacity reduced to 0.3 (dimmed)
- **No search active**: All booths render at their normal opacity

### Auto-Pan to First Match
- When search results appear, the canvas pans to center the first matching booth in the viewport
- If the current zoom is below 0.4 (40%), it zooms in to 0.4 for visibility
- If already zoomed in further, the current zoom level is preserved

### Keyboard Support
- Escape key clears the active search
- Delete key is already guarded against firing while typing in the search input (existing INPUT tag check)

## Files Modified

- `conventioneer-demo/src/components/FloorPlanEditor.tsx` -- Added search state, search bar UI, glow animation, booth dimming/highlight logic, auto-pan, Escape key handler

## Files Created

- `conventioneer-demo/src/tests/ticket12.test.ts` -- 31 functional tests covering search matching, opacity dimming, auto-pan computation, result counting, clear behavior, UI element existence, and mock data shape

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       31 passed, 31 total
```

## Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| Type "Nativa" (or any exhibitor name substring) -- booth highlights, others dim, canvas pans to it | PASS -- exhibitor name search with case-insensitive substring matching, glow ring, 0.3 dimming, auto-pan |
| Type "E103" (or any booth number) -- matching booth highlights | PASS -- booth number substring matching works |
| Clear search -- normal view restored | PASS -- clearing input or pressing Escape resets all visual state |
| Match count displayed | PASS -- green "N matches" or red "No matches" shown next to search bar |
