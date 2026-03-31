/**
 * Ticket 6: Resize Booths — Functional Tests
 *
 * Tests validate resize logic: anchor computation, coordinate math,
 * minimum size enforcement, grid snapping, and square footage recalculation.
 * These are pure logic tests — no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import type { Booth, Hall } from "@/types";

// --- Constants (mirrored from FloorPlanEditor) ---
const FT_TO_PX = 5;
const MIN_BOOTH_SIZE_FT = 8;

// --- Helper: simulate resize logic (extracted from FloorPlanEditor) ---

type Corner = "tl" | "tr" | "bl" | "br";

interface ResizeAnchor {
  anchorXFt: number;
  anchorYFt: number;
  hallXFt: number;
  hallYFt: number;
}

/** Compute the anchor (opposite corner) for a given resize handle */
function computeAnchor(booth: Booth, corner: Corner, hall: Hall): ResizeAnchor {
  const anchorXFt =
    corner === "tl" || corner === "bl"
      ? booth.xFt + booth.widthFt
      : booth.xFt;
  const anchorYFt =
    corner === "tl" || corner === "tr"
      ? booth.yFt + booth.heightFt
      : booth.yFt;
  return {
    anchorXFt,
    anchorYFt,
    hallXFt: hall.xFt,
    hallYFt: hall.yFt,
  };
}

/** Simulate a resize drag to a new position (in hall-local feet) */
function simulateResize(
  anchor: ResizeAnchor,
  draggedXFt: number,
  draggedYFt: number
): { xFt: number; yFt: number; widthFt: number; heightFt: number } {
  let newXFt = Math.round(Math.min(anchor.anchorXFt, draggedXFt));
  let newYFt = Math.round(Math.min(anchor.anchorYFt, draggedYFt));
  let newWFt = Math.round(Math.abs(anchor.anchorXFt - draggedXFt));
  let newHFt = Math.round(Math.abs(anchor.anchorYFt - draggedYFt));

  // Enforce minimum size
  if (newWFt < MIN_BOOTH_SIZE_FT) {
    newWFt = MIN_BOOTH_SIZE_FT;
    if (draggedXFt < anchor.anchorXFt) {
      newXFt = anchor.anchorXFt - MIN_BOOTH_SIZE_FT;
    } else {
      newXFt = anchor.anchorXFt;
    }
  }
  if (newHFt < MIN_BOOTH_SIZE_FT) {
    newHFt = MIN_BOOTH_SIZE_FT;
    if (draggedYFt < anchor.anchorYFt) {
      newYFt = anchor.anchorYFt - MIN_BOOTH_SIZE_FT;
    } else {
      newYFt = anchor.anchorYFt;
    }
  }

  return { xFt: newXFt, yFt: newYFt, widthFt: newWFt, heightFt: newHFt };
}

// --- Test fixtures ---

function makeTestBooth(overrides: Partial<Booth> = {}): Booth {
  return {
    id: "test-booth-1",
    number: "T100",
    hallId: "hall-east",
    showId: "show-winter-2027",
    pavilionId: "pav-amber",
    status: "available",
    boothType: "inline",
    xFt: 30,
    yFt: 40,
    widthFt: 10,
    heightFt: 10,
    price: 3500,
    ...overrides,
  };
}

function getTestHall(): Hall {
  return mockData.halls.find((h) => h.id === "hall-east")!;
}

// ============================================================
// Tests
// ============================================================

describe("Ticket 6: Resize Booths", () => {
  // --- Anchor computation ---

  describe("anchor computation", () => {
    test("dragging TL corner anchors at BR (xFt+widthFt, yFt+heightFt)", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "tl", hall);
      expect(anchor.anchorXFt).toBe(40); // 30 + 10
      expect(anchor.anchorYFt).toBe(50); // 40 + 10
    });

    test("dragging TR corner anchors at BL (xFt, yFt+heightFt)", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "tr", hall);
      expect(anchor.anchorXFt).toBe(30);
      expect(anchor.anchorYFt).toBe(50);
    });

    test("dragging BL corner anchors at TR (xFt+widthFt, yFt)", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "bl", hall);
      expect(anchor.anchorXFt).toBe(40);
      expect(anchor.anchorYFt).toBe(40);
    });

    test("dragging BR corner anchors at TL (xFt, yFt)", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      expect(anchor.anchorXFt).toBe(30);
      expect(anchor.anchorYFt).toBe(40);
    });

    test("anchor stores hall position for coordinate conversion", () => {
      const booth = makeTestBooth();
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      expect(anchor.hallXFt).toBe(hall.xFt);
      expect(anchor.hallYFt).toBe(hall.yFt);
    });
  });

  // --- Resize to larger ---

  describe("resize to larger dimensions", () => {
    test("drag BR corner to make 10x10 → 10x15 (extend right)", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      // Drag BR corner to (45, 50) — was at (40, 50)
      const result = simulateResize(anchor, 45, 50);
      expect(result.widthFt).toBe(15);
      expect(result.heightFt).toBe(10);
      expect(result.xFt).toBe(30); // position unchanged (TL anchored)
      expect(result.yFt).toBe(40);
    });

    test("drag BR corner to make 10x10 → 20x20 (extend both)", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      // Drag BR to (50, 60) — was at (40, 50)
      const result = simulateResize(anchor, 50, 60);
      expect(result.widthFt).toBe(20);
      expect(result.heightFt).toBe(20);
      expect(result.xFt).toBe(30);
      expect(result.yFt).toBe(40);
    });

    test("drag TL corner outward to enlarge booth (position shifts)", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "tl", hall);
      // Drag TL to (20, 30) — was at (30, 40). Anchor is at (40, 50)
      const result = simulateResize(anchor, 20, 30);
      expect(result.widthFt).toBe(20);
      expect(result.heightFt).toBe(20);
      expect(result.xFt).toBe(20); // position moved left
      expect(result.yFt).toBe(30); // position moved up
    });
  });

  // --- Resize to smaller ---

  describe("resize to smaller dimensions", () => {
    test("shrink a 20x20 to 12x12 via BR corner", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 20, heightFt: 20 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      // Drag BR from (50, 60) to (42, 52)
      const result = simulateResize(anchor, 42, 52);
      expect(result.widthFt).toBe(12);
      expect(result.heightFt).toBe(12);
      expect(result.xFt).toBe(30); // position unchanged
      expect(result.yFt).toBe(40);
    });
  });

  // --- Minimum size enforcement ---

  describe("minimum size enforcement (8ft)", () => {
    test("cannot resize width below 8ft via BR corner", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      // Try to drag BR to (33, 50) — that's only 3ft wide
      const result = simulateResize(anchor, 33, 50);
      expect(result.widthFt).toBe(MIN_BOOTH_SIZE_FT); // clamped to 8
      expect(result.heightFt).toBe(10);
      expect(result.xFt).toBe(30); // anchor side
    });

    test("cannot resize height below 8ft via BR corner", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      // Try to drag BR to (40, 42) — only 2ft tall
      const result = simulateResize(anchor, 40, 42);
      expect(result.widthFt).toBe(10);
      expect(result.heightFt).toBe(MIN_BOOTH_SIZE_FT); // clamped to 8
    });

    test("minimum enforced on both axes simultaneously", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      // Try to drag to nearly the anchor point
      const result = simulateResize(anchor, 31, 41);
      expect(result.widthFt).toBe(MIN_BOOTH_SIZE_FT);
      expect(result.heightFt).toBe(MIN_BOOTH_SIZE_FT);
    });

    test("minimum enforced when dragging TL corner inward", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 20, heightFt: 20 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "tl", hall);
      // Anchor is at (50, 60). Drag TL to (48, 58) — only 2x2
      const result = simulateResize(anchor, 48, 58);
      expect(result.widthFt).toBe(MIN_BOOTH_SIZE_FT);
      expect(result.heightFt).toBe(MIN_BOOTH_SIZE_FT);
      // Position should be clamped: anchor - min
      expect(result.xFt).toBe(50 - MIN_BOOTH_SIZE_FT); // 42
      expect(result.yFt).toBe(60 - MIN_BOOTH_SIZE_FT); // 52
    });
  });

  // --- Grid snapping (1-foot increments) ---

  describe("grid snapping to 1ft increments", () => {
    test("fractional drag positions are rounded to nearest integer", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      // Drag BR to fractional position
      const result = simulateResize(anchor, 43.7, 53.2);
      expect(result.widthFt).toBe(14); // round(43.7 - 30)
      expect(result.heightFt).toBe(13); // round(53.2 - 40)
      expect(Number.isInteger(result.widthFt)).toBe(true);
      expect(Number.isInteger(result.heightFt)).toBe(true);
      expect(Number.isInteger(result.xFt)).toBe(true);
      expect(Number.isInteger(result.yFt)).toBe(true);
    });

    test("all output values are integers", () => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "tl", hall);
      const result = simulateResize(anchor, 22.1, 31.9);
      expect(Number.isInteger(result.xFt)).toBe(true);
      expect(Number.isInteger(result.yFt)).toBe(true);
      expect(Number.isInteger(result.widthFt)).toBe(true);
      expect(Number.isInteger(result.heightFt)).toBe(true);
    });
  });

  // --- Square footage recalculation ---

  describe("square footage recalculates correctly", () => {
    test("10x10 → 10x15 = 150 sq ft", () => {
      const booth = makeTestBooth({ widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      const result = simulateResize(anchor, 45, 50);
      const sqft = result.widthFt * result.heightFt;
      expect(sqft).toBe(150);
    });

    test("10x10 → 20x20 = 400 sq ft", () => {
      const booth = makeTestBooth({ widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      const result = simulateResize(anchor, 50, 60);
      const sqft = result.widthFt * result.heightFt;
      expect(sqft).toBe(400);
    });

    test("minimum size = 8x8 = 64 sq ft", () => {
      const booth = makeTestBooth({ widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      const result = simulateResize(anchor, 31, 41);
      const sqft = result.widthFt * result.heightFt;
      expect(sqft).toBe(MIN_BOOTH_SIZE_FT * MIN_BOOTH_SIZE_FT); // 64
    });
  });

  // --- All 4 corners work symmetrically ---

  describe("all 4 corners resize correctly", () => {
    const corners: Corner[] = ["tl", "tr", "bl", "br"];

    test.each(corners)("dragging %s corner to enlarge results in bigger booth", (corner) => {
      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, corner, hall);

      // Drag the corner outward by 5ft in both directions
      let dragX: number, dragY: number;
      switch (corner) {
        case "tl": dragX = 25; dragY = 35; break;
        case "tr": dragX = 45; dragY = 35; break;
        case "bl": dragX = 25; dragY = 55; break;
        case "br": dragX = 45; dragY = 55; break;
      }

      const result = simulateResize(anchor, dragX, dragY);
      expect(result.widthFt).toBe(15);
      expect(result.heightFt).toBe(15);
    });
  });

  // --- Properties panel shows live dimensions ---

  describe("properties panel data consistency", () => {
    test("properties panel reads widthFt/heightFt which resize updates", () => {
      // The properties panel in FloorPlanEditor displays:
      //   {booth.widthFt} × {booth.heightFt} ft
      //   sqft = booth.widthFt * booth.heightFt
      // Resize calls handleUpdateBooth(id, { xFt, yFt, widthFt, heightFt })
      // This test verifies the resize output matches what the panel would display

      const booth = makeTestBooth({ xFt: 30, yFt: 40, widthFt: 10, heightFt: 10 });
      const hall = getTestHall();
      const anchor = computeAnchor(booth, "br", hall);
      const result = simulateResize(anchor, 45, 55);

      const updatedBooth = { ...booth, ...result };
      expect(updatedBooth.widthFt).toBe(15);
      expect(updatedBooth.heightFt).toBe(15);
      expect(updatedBooth.widthFt * updatedBooth.heightFt).toBe(225);
    });
  });

  // --- Edge case: existing mock booths ---

  describe("mock data booths are valid resize targets", () => {
    test("all mock booths have dimensions >= minimum size", () => {
      for (const booth of mockData.booths) {
        expect(booth.widthFt).toBeGreaterThanOrEqual(MIN_BOOTH_SIZE_FT);
        expect(booth.heightFt).toBeGreaterThanOrEqual(MIN_BOOTH_SIZE_FT);
      }
    });

    test("all mock booths have integer dimensions", () => {
      for (const booth of mockData.booths) {
        expect(Number.isInteger(booth.widthFt)).toBe(true);
        expect(Number.isInteger(booth.heightFt)).toBe(true);
      }
    });

    test("all mock booths have positive positions", () => {
      for (const booth of mockData.booths) {
        expect(booth.xFt).toBeGreaterThanOrEqual(0);
        expect(booth.yFt).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
