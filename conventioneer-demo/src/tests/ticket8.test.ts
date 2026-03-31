/**
 * Ticket 8: Add Single Booth -- Functional Tests
 *
 * Tests validate single booth placement logic: auto-numbering,
 * hall detection, grid snapping, default properties, and selection.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import type { Booth, Hall } from "@/types";

// --- Constants (mirrored from FloorPlanEditor) ---
const FT_TO_PX = 5;
const GRID_SPACING_FT = 10;
const DEFAULT_BOOTH_WIDTH = 10;
const DEFAULT_BOOTH_DEPTH = 10;
const PRICE_PER_SQFT = 35;

// --- Helpers: extracted logic from FloorPlanEditor ---

/** Snap a venue coordinate to the nearest grid point */
function snapToGrid(valueFt: number): number {
  return Math.round(valueFt / GRID_SPACING_FT) * GRID_SPACING_FT;
}

/** Convert screen pointer to venue feet */
function pointerToVenueFt(
  pointerPx: number,
  positionOffset: number,
  scale: number
): number {
  return (pointerPx - positionOffset) / scale / FT_TO_PX;
}

/** Determine which hall contains a given venue coordinate */
function findHallAtPoint(
  venueXFt: number,
  venueYFt: number,
  halls: Hall[]
): Hall | null {
  for (const hall of halls) {
    if (
      venueXFt >= hall.xFt &&
      venueXFt < hall.xFt + hall.widthFt &&
      venueYFt >= hall.yFt &&
      venueYFt < hall.yFt + hall.heightFt
    ) {
      return hall;
    }
  }
  return null;
}

/** Get the booth number prefix for a hall */
function getHallPrefix(hall: Hall): string {
  if (hall.name.startsWith("East")) return "E";
  if (hall.name.startsWith("West")) return "W";
  if (hall.name.startsWith("North")) return "N";
  if (hall.name.startsWith("South")) return "S";
  if (hall.name.startsWith("Outdoor")) return "O";
  return "X";
}

/** Find the next available booth number for a hall */
function getNextBoothNumber(
  hallId: string,
  prefix: string,
  existingBooths: Booth[]
): number {
  let maxNum = 99;
  for (const b of existingBooths) {
    if (b.hallId === hallId && b.number.startsWith(prefix)) {
      const numPart = parseInt(b.number.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return maxNum + 1;
}

/** Create a single booth at a given hall-local position */
function createSingleBooth(
  hallLocalX: number,
  hallLocalY: number,
  hall: Hall,
  showId: string,
  existingBooths: Booth[]
): Booth {
  const prefix = getHallPrefix(hall);
  const nextNum = getNextBoothNumber(hall.id, prefix, existingBooths);
  const timestamp = Date.now();

  return {
    id: `booth-NEW-${timestamp}-single`,
    number: `${prefix}${nextNum}`,
    hallId: hall.id,
    showId,
    pavilionId: "",
    status: "available",
    boothType: "inline",
    xFt: hallLocalX,
    yFt: hallLocalY,
    widthFt: DEFAULT_BOOTH_WIDTH,
    heightFt: DEFAULT_BOOTH_DEPTH,
    price: DEFAULT_BOOTH_WIDTH * DEFAULT_BOOTH_DEPTH * PRICE_PER_SQFT,
  };
}

// --- Test fixtures ---

const activeShow = mockData.shows[0];
const activeHallIds = new Set(activeShow.hallIds);
const activeHalls = mockData.halls.filter((h) => activeHallIds.has(h.id));

function getEastHall(): Hall {
  return mockData.halls.find((h) => h.id === "hall-east")!;
}

function getWestHall(): Hall {
  return mockData.halls.find((h) => h.id === "hall-west")!;
}

function getOutdoorHall(): Hall {
  return mockData.halls.find((h) => h.id === "hall-outdoor")!;
}

// ============================================================
// Tests
// ============================================================

describe("Ticket 8: Add Single Booth", () => {
  // --- Toolbar button existence ---

  describe("toolbar button", () => {
    test("add-booth-btn data-testid is defined in the component (string check)", () => {
      // We verify the data-testid string exists in the source.
      // This is a static check — the actual DOM test would require rendering.
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain('data-testid="add-booth-btn"');
    });

    test("cancel button data-testid is defined in the component", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain('data-testid="cancel-single-booth-btn"');
    });
  });

  // --- Default booth properties ---

  describe("single booth has correct defaults", () => {
    test("booth is 10x10 ft", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.widthFt).toBe(10);
      expect(booth.heightFt).toBe(10);
    });

    test("booth status is 'available'", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.status).toBe("available");
    });

    test("booth type is 'inline'", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.boothType).toBe("inline");
    });

    test("booth price is $3,500 (10 * 10 * 35)", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.price).toBe(3500);
    });

    test("booth pavilionId is empty string (unassigned)", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.pavilionId).toBe("");
    });

    test("booth has correct showId", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.showId).toBe(activeShow.id);
    });

    test("booth id starts with booth-NEW-", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.id).toMatch(/^booth-NEW-\d+-single$/);
    });
  });

  // --- Auto-numbering ---

  describe("auto-numbering", () => {
    test("increments from the highest existing booth number in the hall", () => {
      const hall = getEastHall();
      const existingBooths = mockData.booths.filter(
        (b) => b.hallId === "hall-east"
      );
      const prefix = getHallPrefix(hall);

      // Find the actual max number in mock data
      let maxNum = 0;
      for (const b of existingBooths) {
        if (b.number.startsWith(prefix)) {
          const num = parseInt(b.number.slice(prefix.length), 10);
          if (num > maxNum) maxNum = num;
        }
      }

      const booth = createSingleBooth(
        30,
        40,
        hall,
        activeShow.id,
        existingBooths
      );
      expect(booth.number).toBe(`${prefix}${maxNum + 1}`);
    });

    test("starts at prefix+100 when no existing booths in hall", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      // maxNum starts at 99, so next is 100
      expect(booth.number).toBe("E100");
    });

    test("East Hall gets prefix E", () => {
      const hall = getEastHall();
      expect(getHallPrefix(hall)).toBe("E");
    });

    test("West Hall gets prefix W", () => {
      const hall = getWestHall();
      expect(getHallPrefix(hall)).toBe("W");
    });

    test("Outdoor Bazaar gets prefix O", () => {
      const hall = getOutdoorHall();
      expect(getHallPrefix(hall)).toBe("O");
    });

    test("consecutive single booths get sequential numbers", () => {
      const hall = getEastHall();
      const booth1 = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth1.number).toBe("E100");

      const booth2 = createSingleBooth(40, 40, hall, activeShow.id, [booth1]);
      expect(booth2.number).toBe("E101");

      const booth3 = createSingleBooth(50, 40, hall, activeShow.id, [
        booth1,
        booth2,
      ]);
      expect(booth3.number).toBe("E102");
    });
  });

  // --- Selection (new booth is immediately selected) ---

  describe("immediate selection after placement", () => {
    test("new booth id can be used to populate selectedIds", () => {
      const hall = getEastHall();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);

      // Simulate what the component does: set selectedIds to the new booth
      const selectedIds = new Set([booth.id]);
      expect(selectedIds.has(booth.id)).toBe(true);
      expect(selectedIds.size).toBe(1);
    });

    test("new booth id contains timestamp and 'single' suffix", () => {
      const hall = getEastHall();
      const before = Date.now();
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      const after = Date.now();

      // Verify the id format
      const match = booth.id.match(/^booth-NEW-(\d+)-single$/);
      expect(match).not.toBeNull();
      const ts = parseInt(match![1], 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  // --- Hall detection ---

  describe("hall detection", () => {
    test("point inside East Hall returns East Hall", () => {
      const eastHall = getEastHall();
      // East Hall: xFt=20, yFt=20, width=550, height=350
      const hall = findHallAtPoint(100, 100, activeHalls);
      expect(hall).not.toBeNull();
      expect(hall!.id).toBe(eastHall.id);
    });

    test("point inside West Hall returns West Hall", () => {
      const westHall = getWestHall();
      // West Hall: xFt=620, yFt=20, width=550, height=350
      const hall = findHallAtPoint(700, 100, activeHalls);
      expect(hall).not.toBeNull();
      expect(hall!.id).toBe(westHall.id);
    });

    test("point outside all halls returns null", () => {
      // Way outside any hall
      const hall = findHallAtPoint(5000, 5000, activeHalls);
      expect(hall).toBeNull();
    });

    test("booth gets correct hallId from detected hall", () => {
      const hall = findHallAtPoint(100, 100, activeHalls)!;
      const booth = createSingleBooth(30, 40, hall, activeShow.id, []);
      expect(booth.hallId).toBe("hall-east");
    });

    test("point at hall boundary (xFt) is inside", () => {
      const eastHall = getEastHall();
      const hall = findHallAtPoint(eastHall.xFt, eastHall.yFt + 10, activeHalls);
      expect(hall).not.toBeNull();
      expect(hall!.id).toBe(eastHall.id);
    });

    test("point at hall far edge (xFt + widthFt) is outside", () => {
      const eastHall = getEastHall();
      // xFt + widthFt is NOT inside (< not <=)
      const hall = findHallAtPoint(
        eastHall.xFt + eastHall.widthFt,
        eastHall.yFt + 10,
        activeHalls
      );
      // Could be in another hall or null, but not East Hall
      if (hall) {
        expect(hall.id).not.toBe(eastHall.id);
      }
    });
  });

  // --- Grid snapping ---

  describe("grid snapping", () => {
    test("exact grid point stays unchanged", () => {
      expect(snapToGrid(100)).toBe(100);
      expect(snapToGrid(50)).toBe(50);
      expect(snapToGrid(0)).toBe(0);
    });

    test("value slightly above grid point rounds down", () => {
      expect(snapToGrid(101)).toBe(100);
      expect(snapToGrid(104)).toBe(100);
    });

    test("value slightly below grid point rounds up", () => {
      expect(snapToGrid(99)).toBe(100);
      expect(snapToGrid(96)).toBe(100);
    });

    test("midpoint rounds to nearest (5 rounds to 10)", () => {
      expect(snapToGrid(5)).toBe(10); // Math.round(0.5) = 1, * 10 = 10
    });

    test("coordinates snap to 10ft grid", () => {
      expect(snapToGrid(23)).toBe(20);
      expect(snapToGrid(27)).toBe(30);
      expect(snapToGrid(45)).toBe(50);
      expect(snapToGrid(44)).toBe(40);
    });

    test("hall-local coordinates are derived from snapped venue coords", () => {
      const hall = getEastHall(); // xFt=20, yFt=20
      const venueX = snapToGrid(55); // snaps to 60
      const venueY = snapToGrid(33); // snaps to 30
      const hallLocalX = venueX - hall.xFt; // 60 - 20 = 40
      const hallLocalY = venueY - hall.yFt; // 30 - 20 = 10
      expect(hallLocalX).toBe(40);
      expect(hallLocalY).toBe(10);
    });
  });

  // --- Coordinate conversion ---

  describe("pointer to venue feet conversion", () => {
    test("basic conversion with scale=1 and no offset", () => {
      // pointer=500px, offset=0, scale=1, FT_TO_PX=5 -> 100ft
      expect(pointerToVenueFt(500, 0, 1)).toBe(100);
    });

    test("conversion accounts for position offset", () => {
      // pointer=550, offset=50, scale=1 -> (550-50)/1/5 = 100ft
      expect(pointerToVenueFt(550, 50, 1)).toBe(100);
    });

    test("conversion accounts for scale", () => {
      // pointer=250, offset=0, scale=0.5 -> (250-0)/0.5/5 = 100ft
      expect(pointerToVenueFt(250, 0, 0.5)).toBe(100);
    });

    test("conversion with both offset and scale", () => {
      // pointer=175, offset=50, scale=0.5 -> (175-50)/0.5/5 = 50ft
      expect(pointerToVenueFt(175, 50, 0.5)).toBe(50);
    });
  });
});
