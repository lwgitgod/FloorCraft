/**
 * Ticket 5: Drag to Reposition Booths — Unit Tests
 *
 * Tests the core logic functions used by the drag-to-reposition feature:
 * - Snap-to-grid (1-foot grid)
 * - Multi-booth group drag delta calculation
 * - Pixel ↔ feet coordinate conversion
 */

// --- Constants (matching FloorPlanEditor.tsx) ---
const FT_TO_PX = 5;

// --- Helper functions extracted for testing ---

/** Snap a pixel value to the nearest foot boundary */
function snapToFoot(worldPx: number): number {
  return Math.round(worldPx / FT_TO_PX) * FT_TO_PX;
}

/** Convert a world pixel coordinate to hall-local feet */
function worldPxToHallLocalFt(
  worldPx: number,
  hallOriginFt: number
): number {
  return worldPx / FT_TO_PX - hallOriginFt;
}

/** Convert hall-local feet to world pixel coordinate */
function hallLocalFtToWorldPx(
  hallLocalFt: number,
  hallOriginFt: number
): number {
  return (hallOriginFt + hallLocalFt) * FT_TO_PX;
}

/** Calculate snapped delta in feet between two world pixel positions */
function calcDragDeltaFt(
  startPx: { x: number; y: number },
  endPx: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: Math.round((endPx.x - startPx.x) / FT_TO_PX),
    y: Math.round((endPx.y - startPx.y) / FT_TO_PX),
  };
}

/** Apply a delta to multiple booths, returning new positions */
function applyGroupDragDelta(
  boothPositions: Map<string, { xFt: number; yFt: number }>,
  deltaFt: { x: number; y: number }
): Map<string, { xFt: number; yFt: number }> {
  const result = new Map<string, { xFt: number; yFt: number }>();
  boothPositions.forEach((pos, id) => {
    result.set(id, {
      xFt: pos.xFt + deltaFt.x,
      yFt: pos.yFt + deltaFt.y,
    });
  });
  return result;
}

// ============================================================
// Tests
// ============================================================

describe("Ticket 5: Drag to Reposition Booths", () => {
  describe("snapToFoot", () => {
    it("snaps exact foot boundary (no change needed)", () => {
      // 10 feet = 50px, already on grid
      expect(snapToFoot(50)).toBe(50);
    });

    it("snaps slightly above a foot boundary down", () => {
      // 50px + 1px = 51px → rounds to 50px (10ft)
      expect(snapToFoot(51)).toBe(50);
    });

    it("snaps slightly below a foot boundary up", () => {
      // 50px - 1px = 49px → rounds to 50px (10ft)
      expect(snapToFoot(49)).toBe(50);
    });

    it("snaps at the halfway point up", () => {
      // 52.5px → rounds to 55px (11ft)
      // Math.round(52.5 / 5) = Math.round(10.5) = 11 → 55
      // Note: JS Math.round rounds .5 up
      expect(snapToFoot(52.5)).toBe(55);
    });

    it("snaps zero correctly", () => {
      expect(snapToFoot(0)).toBe(0);
    });

    it("handles large values", () => {
      // 1200ft = 6000px
      expect(snapToFoot(6002)).toBe(6000);
    });
  });

  describe("worldPxToHallLocalFt", () => {
    it("converts world pixels to hall-local feet for East Hall", () => {
      // East Hall origin is at xFt=20. A booth at world pixel 200
      // worldFt = 200/5 = 40. hallLocal = 40 - 20 = 20ft
      expect(worldPxToHallLocalFt(200, 20)).toBe(20);
    });

    it("returns zero when at hall origin", () => {
      // Hall at xFt=20 → world pixel = 20*5 = 100
      expect(worldPxToHallLocalFt(100, 20)).toBe(0);
    });

    it("returns negative when before hall origin", () => {
      expect(worldPxToHallLocalFt(50, 20)).toBe(-10);
    });
  });

  describe("hallLocalFtToWorldPx", () => {
    it("converts hall-local feet to world pixels", () => {
      // Booth at hallLocal 30ft, hall origin 20ft → world = (20+30)*5 = 250px
      expect(hallLocalFtToWorldPx(30, 20)).toBe(250);
    });

    it("at hall origin returns hall origin in pixels", () => {
      expect(hallLocalFtToWorldPx(0, 20)).toBe(100);
    });

    it("round-trips correctly", () => {
      const hallOrigin = 620; // West Hall
      const localFt = 45;
      const px = hallLocalFtToWorldPx(localFt, hallOrigin);
      const backToFt = worldPxToHallLocalFt(px, hallOrigin);
      expect(backToFt).toBe(localFt);
    });
  });

  describe("calcDragDeltaFt", () => {
    it("calculates zero delta for no movement", () => {
      const start = { x: 100, y: 200 };
      const end = { x: 100, y: 200 };
      expect(calcDragDeltaFt(start, end)).toEqual({ x: 0, y: 0 });
    });

    it("calculates positive delta (dragged right and down)", () => {
      // Dragged 50px right (10ft), 25px down (5ft)
      const start = { x: 100, y: 200 };
      const end = { x: 150, y: 225 };
      expect(calcDragDeltaFt(start, end)).toEqual({ x: 10, y: 5 });
    });

    it("calculates negative delta (dragged left and up)", () => {
      const start = { x: 200, y: 300 };
      const end = { x: 150, y: 250 };
      expect(calcDragDeltaFt(start, end)).toEqual({ x: -10, y: -10 });
    });

    it("snaps sub-foot pixel movements to nearest foot", () => {
      // 7px movement / 5px per foot = 1.4ft → rounds to 1ft
      const start = { x: 100, y: 100 };
      const end = { x: 107, y: 100 };
      expect(calcDragDeltaFt(start, end)).toEqual({ x: 1, y: 0 });
    });

    it("snaps movement at halfway point", () => {
      // 13px / 5 = 2.6ft → rounds to 3ft
      const start = { x: 100, y: 100 };
      const end = { x: 113, y: 100 };
      expect(calcDragDeltaFt(start, end)).toEqual({ x: 3, y: 0 });
    });
  });

  describe("applyGroupDragDelta (multi-select group drag)", () => {
    it("applies delta to a single booth", () => {
      const positions = new Map([["b1", { xFt: 30, yFt: 40 }]]);
      const delta = { x: 10, y: -5 };
      const result = applyGroupDragDelta(positions, delta);
      expect(result.get("b1")).toEqual({ xFt: 40, yFt: 35 });
    });

    it("applies same delta to all selected booths, maintaining relative positions", () => {
      const positions = new Map([
        ["b1", { xFt: 30, yFt: 40 }],
        ["b2", { xFt: 40, yFt: 40 }],
        ["b3", { xFt: 30, yFt: 50 }],
      ]);
      const delta = { x: 5, y: 10 };
      const result = applyGroupDragDelta(positions, delta);

      expect(result.get("b1")).toEqual({ xFt: 35, yFt: 50 });
      expect(result.get("b2")).toEqual({ xFt: 45, yFt: 50 });
      expect(result.get("b3")).toEqual({ xFt: 35, yFt: 60 });

      // Verify relative positions are preserved
      const r1 = result.get("b1")!;
      const r2 = result.get("b2")!;
      const r3 = result.get("b3")!;
      expect(r2.xFt - r1.xFt).toBe(10); // b2 is still 10ft right of b1
      expect(r3.yFt - r1.yFt).toBe(10); // b3 is still 10ft below b1
      expect(r2.yFt - r1.yFt).toBe(0);  // b2 same row as b1
    });

    it("handles zero delta (no movement)", () => {
      const positions = new Map([
        ["b1", { xFt: 30, yFt: 40 }],
        ["b2", { xFt: 50, yFt: 60 }],
      ]);
      const result = applyGroupDragDelta(positions, { x: 0, y: 0 });
      expect(result.get("b1")).toEqual({ xFt: 30, yFt: 40 });
      expect(result.get("b2")).toEqual({ xFt: 50, yFt: 60 });
    });

    it("handles negative coordinates", () => {
      const positions = new Map([["b1", { xFt: 5, yFt: 5 }]]);
      const delta = { x: -10, y: -10 };
      const result = applyGroupDragDelta(positions, delta);
      expect(result.get("b1")).toEqual({ xFt: -5, yFt: -5 });
    });
  });

  describe("end-to-end drag scenario", () => {
    it("simulates dragging a booth 3 feet right and 2 feet down", () => {
      const hallOriginFt = { x: 20, y: 20 }; // East Hall
      const boothStartFt = { xFt: 30, yFt: 40 };

      // 1. Booth's initial world pixel position
      const startPx = {
        x: hallLocalFtToWorldPx(boothStartFt.xFt, hallOriginFt.x),
        y: hallLocalFtToWorldPx(boothStartFt.yFt, hallOriginFt.y),
      };
      expect(startPx).toEqual({ x: 250, y: 300 });

      // 2. User drags to a new pixel position (3ft right, 2ft down)
      const endPx = {
        x: startPx.x + 3 * FT_TO_PX, // +15px
        y: startPx.y + 2 * FT_TO_PX, // +10px
      };

      // 3. Calculate snapped delta
      const delta = calcDragDeltaFt(startPx, endPx);
      expect(delta).toEqual({ x: 3, y: 2 });

      // 4. Apply to booth
      const positions = new Map([["booth1", boothStartFt]]);
      const result = applyGroupDragDelta(positions, delta);
      expect(result.get("booth1")).toEqual({ xFt: 33, yFt: 42 });
    });
  });
});
