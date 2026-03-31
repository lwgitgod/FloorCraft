# Ticket 2: Render Mock Booths as Colored Rectangles

**Status:** Complete

## What Was Implemented

### Types (`src/types/index.ts`)
- TypeScript interfaces for: `Venue`, `Hall`, `Pavilion`, `Booth`, `Show`, `MockData`
- Enum types: `VenueType` ("owned" | "rental"), `BoothStatus` ("sold" | "available" | "held" | "blocked")

### Mock Data (`src/data/mockData.ts`)
- 3 venues: Tucson Expo Center (owned), World Market Center LV (rental), San Diego Convention Center (rental)
- 5 halls for Tucson: East Hall, West Hall, North Hall, South Hall, Outdoor Bazaar
- 1 show: JOGS Winter 2027 using East Hall + West Hall + Outdoor Bazaar
- 6 pavilions with distinct hex colors: Amber (#D4920B), Southwest/Turquoise (#1BA39C), International Gemstone (#8E44AD), Silver Jewelry (#7F8C8D), Designer Jewelry (#C0392B), Outdoor Dealers (#27AE60)
- 100 booths generated via seeded pseudo-random algorithm across 3 halls
- Status distribution: ~60% sold, ~20% available, ~10% held, ~10% blocked
- Booth sizes: mix of 10x10, 10x20, and 20x20
- Sold booths assigned exhibitor names from a pool of 50 gem/jewelry businesses

### Floor Plan Editor (`src/components/FloorPlanEditor.tsx`)
- Full-screen Konva Stage with dark theme
- Zoom (scroll wheel, centered on pointer) and pan (click-drag)
- Venue background rectangle with hall sub-regions drawn as colored areas
- Grid lines visible at zoom levels above 50%
- Booths rendered as Konva Rects positioned by x/y coordinates (feet scaled to pixels, 1ft = 5px)
- Booths color-coded by pavilion
- Blocked booths rendered in gray (#555566)
- Held booths rendered with white dashed border
- Available booths at reduced opacity
- Booth numbers displayed as centered text (visible at 25%+ zoom)
- Exhibitor names displayed inside booths (visible at 60%+ zoom)
- Pavilion color legend in toolbar
- Hall name labels on the canvas

## Files Created/Modified

| File | Action |
|---|---|
| `src/types/index.ts` | Created |
| `src/data/mockData.ts` | Created |
| `src/components/FloorPlanEditor.tsx` | Modified (added booth rendering, hall backgrounds, pavilion legend) |
| `src/tests/ticket2.test.ts` | Created |
| `jest.config.js` | Created |
| `package.json` | Modified (added test script, jest/ts-jest devDependencies) |
| `tickets/Ticket2.md` | Created |

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       37 passed, 37 total
```

All 37 tests passing across 8 describe blocks:

| Category | Tests | Status |
|---|---|---|
| Mock data integrity | 7 | All pass |
| Booth data structure | 7 | All pass |
| Status distribution | 5 | All pass |
| Pavilion coverage | 2 | All pass |
| getBoothFill - pavilion mode | 6 | All pass |
| getBoothFill - status mode | 5 | All pass |
| STATUS_COLORS constant | 2 | All pass |
| Color integration with mock data | 3 | All pass |

Original 21 tests covered data integrity. 16 tests added (2026-03-31) covering `getBoothFill()` color utility:
- Pavilion mode returns correct pavilion color for available/sold/held booths
- Pavilion mode returns `BLOCKED_COLOR` (#555566) for blocked booths regardless of pavilion
- Pavilion mode falls back to #666 for unknown pavilion IDs
- Default color mode is "pavilion" when omitted
- Status mode returns correct colors for all four statuses (green/red/yellow/gray)
- Status mode ignores pavilion assignment
- `STATUS_COLORS` has entries for all four statuses with valid hex values
- Every mock booth resolves to a valid hex color in both modes
- Blocked booths intentionally get different gray shades in pavilion vs status mode

## Known Issues / Deviations

- Spec asked for "1 foot = ~4 pixels" but the existing Ticket 1 shell used `FT_TO_PX = 5`. Kept at 5 for consistency with the existing canvas shell.
- Venue height increased from 800ft to 1000ft to accommodate the Outdoor Bazaar area below the main halls.
- The dashed border for "held" booths is implemented via Konva's `dash` property on the stroke, which produces a standard dashed line effect.
