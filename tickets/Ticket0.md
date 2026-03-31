# Ticket 0 — Empty Expo Hall

**Status:** COMPLETE (v2 — revised after feedback)
**Date completed:** 2026-03-31

## Objective

Create `EmptyTusconExpoHall.PNG` — the Tucson Expo Center building with no booths, ready to serve as background for the Konva floor plan editor.

## Key Insight

The Tucson Expo Center is a **"+" (plus/cross) shaped building**:
- **East Hall** = top arm
- **West Hall** = bottom arm
- **North Hall** = left arm
- **South Hall** = right arm
- Center area where all four meet
- Two internal walls (with doorway gaps) divide North/South halls from center

That's it. One polygon. Two internal walls.

## v2 Changes

v1 drew individual rectangles for every pavilion zone — looked nothing like the original. v2 draws the building as a single "+" polygon with internal walls, matching the actual building footprint.

## Output

| Item | Path |
|------|------|
| Generated image | `EmptyTusconExpoHall.PNG` (project root, 1738x1420 px) |
| Generator script | `conventioneer-demo/src/generate-empty-expo-hall.py` |
| Test file | `conventioneer-demo/src/tests/ticket0.test.ts` |

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

Tests verify:
1. Output file exists
2. File is non-empty (> 10 KB)
3. Valid PNG signature (magic bytes)
4. IHDR chunk contains reasonable dimensions (800-4000 range)
5. Generator script exists

## What the image includes

- "+" shaped building outline (single polygon)
- Internal walls with doorway gaps
- Hall labels: East, North, South, West
- External structures: Outdoor Dealers, Food Court, Registration, Tents W
- Branding: JOGS logo, show title, dates
- Parking labels, Valet Parking, Shuttle Hub
- Entrance arrows at Registration

## What it does NOT include

- No booth rectangles (that's the point)
- No pavilion zone labels inside halls (booths define pavilions, not the building)
- No restroom markers, UPS, or other clutter
