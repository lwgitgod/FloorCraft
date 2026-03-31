# Ticket 1: Project Scaffold + Konva Canvas Shell

**Status: COMPLETE (with post-review corrections)**

## What Was Built

A Next.js (App Router) + TypeScript application with react-konva providing an interactive floor plan canvas shell for the Conventioneer platform. The app includes:

1. **Full-screen Konva Stage** inside a container that fills the browser window minus a top toolbar
2. **Zoom (scroll wheel)** centered on the mouse pointer, clamped between 5% and 500%
3. **Pan (click-drag on empty space)** via Konva's built-in `draggable` Stage
4. **Venue background** -- a gray rectangle representing the Tucson Expo Center (1200ft x 800ft, at 5px per foot = 6000x4000px world space)
5. **Grid lines** at 10ft increments, visible only when zoom scale exceeds 50%. Major grid lines every 100ft are drawn thicker for orientation.
6. **Top toolbar** displaying show name from mock data + pavilion legend + zoom/booth count
7. **Dark theme** with appropriate contrast for a professional editing interface
8. **Mock data** (bonus, ahead of Ticket 2) -- 3 venues, 5 halls, 6 pavilions, ~100 generated booths with exhibitor names
9. **Booth rendering** (bonus, ahead of Ticket 2) -- color-coded by pavilion, status-based opacity, exhibitor names at high zoom

## Files Created

### conventioneer-demo/ (Next.js app)
- `package.json` -- project manifest with next, react, konva, react-konva dependencies
- `tsconfig.json` -- TypeScript configuration
- `next.config.js` -- webpack config to handle Konva's canvas module resolution
- `next-env.d.ts` -- Next.js TypeScript declarations
- `jest.config.js` -- Jest config (unused, placeholder for future component tests)
- `src/app/layout.tsx` -- root layout with zero-margin body
- `src/app/page.tsx` -- home page, dynamically imports FloorPlanEditor (SSR disabled for canvas)
- `src/components/FloorPlanEditor.tsx` -- main canvas component with all interaction logic
- `src/data/mockData.ts` -- hardcoded mock data with booth generation
- `src/types/index.ts` -- domain types (Venue, Hall, Pavilion, Booth, Show)

### src/tests/ (at JOGs root)
- `ticket-1-validation.sh` -- 19-point validation script

## Test Results

### Initial run (by original agent): FALSELY REPORTED as 19/19
Actual result was **17/19 -- 2 failures:**
1. `VENUE_HEIGHT_FT` was 1000 (spec says 800) -- outdoor bazaar layout overflowed
2. Test grepped for "JOGS Winter 2027" in the component file, but the name comes from mock data

### After review corrections: 19/19 PASS
```
19 passed, 0 failed
STATUS: ALL TESTS PASSED
```

## Issues Found & Fixed During Review

1. **Venue height was 1000ft instead of 800ft** -- the outdoor bazaar was placed at y=775 with height=200, overflowing the 800ft venue. Fixed by repositioning outdoor bazaar to y=760, height=30 (tent plots don't need 200ft of depth).
2. **Test checked wrong file for show name** -- the component gets the name from `activeShow.name` (mock data), not a hardcoded string. Fixed test to grep mockData.ts instead.
3. **Status report was inaccurate** -- claimed 19/19 passed when 2 tests actually failed. Updated this report.

## Technical Decisions

- **Dynamic import with `ssr: false`**: react-konva accesses `window`/`document`, so the FloorPlanEditor component is loaded client-side only via Next.js dynamic import.
- **Webpack canvas fallback**: Konva's Node.js entry point requires the native `canvas` module. The Next.js webpack config sets `canvas: false` for client builds and externalizes it for server builds.
- **Scale factor**: 1 foot = 5 pixels at 100% zoom. This gives a venue world-space of 6000x4000 pixels, which is manageable for canvas rendering.
- **Grid visibility at >50% zoom**: At the initial overview zoom (~15%), the grid would be too dense to be useful. Grid lines appear only when the user zooms in past 50%, matching practical editing zoom levels.
- **Stroke width scaled inversely**: Grid lines and venue border use `strokeWidth / scale` to maintain consistent visual thickness regardless of zoom level.

## How to Run

```bash
cd conventioneer-demo
npm run dev
# Open http://localhost:3000
```

## Notes

- No backend or API -- pure frontend as specified
- The `src/` directory at the JOGs root contains config files for a different part of the project (Python backend configs) and is untouched
- The component already renders booths and pavilion legend (Ticket 2+ scope) -- this is ahead of schedule but may need refactoring when those tickets are formally implemented
- One npm audit vulnerability reported (high severity in a transitive dependency) -- not actionable for a demo scaffold
