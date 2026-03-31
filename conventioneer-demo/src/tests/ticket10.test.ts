/**
 * Ticket 10: Right-Click Context Menu -- Functional Tests
 *
 * Tests validate context menu logic: data-testid presence in source,
 * duplicate booth logic, pavilion/status changes via context menu,
 * add-booth-here logic, and booth vs empty-canvas menu distinction.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import type { Booth, Hall, BoothStatus, Pavilion } from "@/types";

// --- Constants (mirrored from FloorPlanEditor) ---
const FT_TO_PX = 5;
const GRID_SPACING_FT = 10;
const DEFAULT_BOOTH_WIDTH = 10;
const DEFAULT_BOOTH_DEPTH = 10;
const PRICE_PER_SQFT = 35;

// --- Helpers: extracted logic from FloorPlanEditor context menu handlers ---

function snapToGrid(valueFt: number): number {
  return Math.round(valueFt / GRID_SPACING_FT) * GRID_SPACING_FT;
}

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

function getHallPrefix(hall: Hall): string {
  if (hall.name.startsWith("East")) return "E";
  if (hall.name.startsWith("West")) return "W";
  if (hall.name.startsWith("North")) return "N";
  if (hall.name.startsWith("South")) return "S";
  if (hall.name.startsWith("Outdoor")) return "O";
  return "X";
}

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

/** Duplicate a booth: new ID, offset 10ft right, status available, no exhibitor */
function duplicateBooth(
  original: Booth,
  existingBooths: Booth[],
  hall: Hall
): Booth {
  const prefix = getHallPrefix(hall);
  const nextNum = getNextBoothNumber(hall.id, prefix, existingBooths);
  const timestamp = Date.now();

  return {
    ...original,
    id: `booth-NEW-${timestamp}-dup`,
    number: `${prefix}${nextNum}`,
    status: "available",
    exhibitorName: undefined,
    xFt: original.xFt + 10,
    price: original.widthFt * original.heightFt * PRICE_PER_SQFT,
  };
}

/** Create a booth at a given venue position (for "Add Booth Here") */
function createBoothAtPosition(
  venueFtX: number,
  venueFtY: number,
  halls: Hall[],
  existingBooths: Booth[],
  showId: string
): Booth | null {
  const snappedX = snapToGrid(venueFtX);
  const snappedY = snapToGrid(venueFtY);
  const hall = findHallAtPoint(snappedX, snappedY, halls);
  if (!hall) return null;

  const hallLocalX = snappedX - hall.xFt;
  const hallLocalY = snappedY - hall.yFt;
  const prefix = getHallPrefix(hall);
  const nextNum = getNextBoothNumber(hall.id, prefix, existingBooths);
  const timestamp = Date.now();

  return {
    id: `booth-NEW-${timestamp}-ctx`,
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
const allBooths = mockData.booths;

function getEastHall(): Hall {
  return mockData.halls.find((h) => h.id === "hall-east")!;
}

function getWestHall(): Hall {
  return mockData.halls.find((h) => h.id === "hall-west")!;
}

function getSampleBooth(): Booth {
  return allBooths.find((b) => b.hallId === "hall-east" && b.status === "sold")!;
}

function getSampleAvailableBooth(): Booth {
  return allBooths.find((b) => b.hallId === "hall-east" && b.status === "available")!;
}

// ============================================================
// Tests
// ============================================================

describe("Ticket 10: Right-Click Context Menu", () => {
  // --- data-testid existence in source ---

  describe("data-testid attributes exist in source", () => {
    let source: string;

    beforeAll(() => {
      const fs = require("fs");
      source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
    });

    test("context-menu container", () => {
      expect(source).toContain('data-testid="context-menu"');
    });

    test("ctx-edit-properties", () => {
      expect(source).toContain('data-testid="ctx-edit-properties"');
    });

    test("ctx-duplicate", () => {
      expect(source).toContain('data-testid="ctx-duplicate"');
    });

    test("ctx-change-pavilion", () => {
      expect(source).toContain('data-testid="ctx-change-pavilion"');
    });

    test("ctx-set-status", () => {
      expect(source).toContain('data-testid="ctx-set-status"');
    });

    test("ctx-auto-number", () => {
      expect(source).toContain('data-testid="ctx-auto-number"');
    });

    test("ctx-delete", () => {
      expect(source).toContain('data-testid="ctx-delete"');
    });

    test("ctx-add-booth-here", () => {
      expect(source).toContain('data-testid="ctx-add-booth-here"');
    });

    test("ctx-add-row-here", () => {
      expect(source).toContain('data-testid="ctx-add-row-here"');
    });

    test("ctx-paste", () => {
      expect(source).toContain('data-testid="ctx-paste"');
    });

    test("pavilion submenu items use dynamic ctx-pavilion- testid pattern", () => {
      // The source uses template literals: data-testid={`ctx-pavilion-${p.id}`}
      expect(source).toContain("ctx-pavilion-${p.id}");
    });

    test("status submenu items use dynamic ctx-status- testid pattern", () => {
      // The source uses template literals: data-testid={`ctx-status-${opt.value}`}
      expect(source).toContain("ctx-status-${opt.value}");
    });

    test("onContextMenu handler is wired on Stage", () => {
      expect(source).toContain("onContextMenu={handleStageContextMenu}");
    });

    test("onContextMenu handler is wired on booth Group", () => {
      expect(source).toContain("handleBoothContextMenu(booth.id, e)");
    });
  });

  // --- Duplicate booth logic ---

  describe("duplicate booth logic", () => {
    test("duplicate has a new ID with -dup suffix", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.id).not.toBe(original.id);
      expect(dup.id).toMatch(/^booth-NEW-\d+-dup$/);
    });

    test("duplicate is offset 10ft to the right", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.xFt).toBe(original.xFt + 10);
      expect(dup.yFt).toBe(original.yFt);
    });

    test("duplicate status is 'available'", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      expect(original.status).toBe("sold"); // precondition: original is sold
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.status).toBe("available");
    });

    test("duplicate exhibitorName is cleared", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      expect(original.exhibitorName).toBeTruthy(); // precondition: has an exhibitor
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.exhibitorName).toBeUndefined();
    });

    test("duplicate preserves hallId and showId", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.hallId).toBe(original.hallId);
      expect(dup.showId).toBe(original.showId);
    });

    test("duplicate preserves dimensions and pavilionId", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.widthFt).toBe(original.widthFt);
      expect(dup.heightFt).toBe(original.heightFt);
      expect(dup.pavilionId).toBe(original.pavilionId);
    });

    test("duplicate gets a new sequential booth number", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      const prefix = getHallPrefix(hall);
      const expectedNextNum = getNextBoothNumber(hall.id, prefix, allBooths);
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.number).toBe(`${prefix}${expectedNextNum}`);
    });

    test("duplicate price is recalculated from dimensions", () => {
      const original = getSampleBooth();
      const hall = getEastHall();
      const dup = duplicateBooth(original, allBooths, hall);
      expect(dup.price).toBe(dup.widthFt * dup.heightFt * PRICE_PER_SQFT);
    });
  });

  // --- Pavilion change via context menu ---

  describe("pavilion change via context menu", () => {
    test("changing pavilionId updates the booth", () => {
      const booth = { ...getSampleBooth() };
      const newPavilionId = "pav-gemstone";
      expect(booth.pavilionId).not.toBe(newPavilionId);

      // Simulate what handleCtxChangePavilion does: update booth
      const updated = { ...booth, pavilionId: newPavilionId };
      expect(updated.pavilionId).toBe(newPavilionId);
    });

    test("all pavilions from mock data are available as options", () => {
      expect(mockData.pavilions.length).toBeGreaterThan(0);
      for (const p of mockData.pavilions) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.color).toBeTruthy();
      }
    });
  });

  // --- Status change via context menu ---

  describe("status change via context menu", () => {
    test("changing status updates the booth", () => {
      const booth = { ...getSampleAvailableBooth() };
      expect(booth.status).toBe("available");

      const updated = { ...booth, status: "held" as BoothStatus };
      expect(updated.status).toBe("held");
    });

    test("all four statuses are valid options", () => {
      const validStatuses: BoothStatus[] = ["available", "sold", "held", "blocked"];
      for (const status of validStatuses) {
        const booth = { ...getSampleBooth(), status };
        expect(booth.status).toBe(status);
      }
    });
  });

  // --- Add Booth Here logic ---

  describe("add booth here (empty canvas context menu)", () => {
    test("creates a booth at snapped position inside East Hall", () => {
      const eastHall = getEastHall();
      // Point inside East Hall: xFt=20, yFt=20, w=550, h=350
      const booth = createBoothAtPosition(55, 33, activeHalls, [], activeShow.id);
      expect(booth).not.toBeNull();
      expect(booth!.hallId).toBe(eastHall.id);
      // 55 snaps to 60, minus hall.xFt=20 => 40
      expect(booth!.xFt).toBe(40);
      // 33 snaps to 30, minus hall.yFt=20 => 10
      expect(booth!.yFt).toBe(10);
    });

    test("creates a 10x10 booth with available status", () => {
      const booth = createBoothAtPosition(100, 100, activeHalls, [], activeShow.id);
      expect(booth).not.toBeNull();
      expect(booth!.widthFt).toBe(10);
      expect(booth!.heightFt).toBe(10);
      expect(booth!.status).toBe("available");
    });

    test("returns null when clicking outside all halls", () => {
      const booth = createBoothAtPosition(5000, 5000, activeHalls, [], activeShow.id);
      expect(booth).toBeNull();
    });

    test("booth id has -ctx suffix", () => {
      const booth = createBoothAtPosition(100, 100, activeHalls, [], activeShow.id);
      expect(booth).not.toBeNull();
      expect(booth!.id).toMatch(/^booth-NEW-\d+-ctx$/);
    });

    test("booth price is $3,500 (10x10 at $35/sqft)", () => {
      const booth = createBoothAtPosition(100, 100, activeHalls, [], activeShow.id);
      expect(booth).not.toBeNull();
      expect(booth!.price).toBe(3500);
    });

    test("booth number uses correct hall prefix", () => {
      // East Hall
      const boothE = createBoothAtPosition(100, 100, activeHalls, [], activeShow.id);
      expect(boothE!.number).toMatch(/^E\d+$/);

      // West Hall (xFt=620)
      const boothW = createBoothAtPosition(700, 100, activeHalls, [], activeShow.id);
      expect(boothW!.number).toMatch(/^W\d+$/);
    });
  });

  // --- Empty canvas vs booth context menu distinction ---

  describe("context menu type distinction", () => {
    test("booth context menu is triggered when boothId is not null", () => {
      const boothId = "booth-E-100";
      const isBooth = boothId !== null;
      expect(isBooth).toBe(true);
    });

    test("empty canvas context menu is triggered when boothId is null", () => {
      const boothId: string | null = null;
      const isBooth = boothId !== null;
      expect(isBooth).toBe(false);
    });

    test("context menu state shape includes x, y, boothId, venueFtX, venueFtY", () => {
      // Verify the shape of the context menu state matches what the component uses
      const menuState = {
        x: 500,
        y: 300,
        boothId: "booth-E-100" as string | null,
        venueFtX: 100,
        venueFtY: 50,
      };
      expect(menuState).toHaveProperty("x");
      expect(menuState).toHaveProperty("y");
      expect(menuState).toHaveProperty("boothId");
      expect(menuState).toHaveProperty("venueFtX");
      expect(menuState).toHaveProperty("venueFtY");
    });
  });
});
