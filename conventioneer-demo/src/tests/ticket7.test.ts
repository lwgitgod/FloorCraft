/**
 * Ticket 7: Add Row of Booths (Row Generator) — Functional Tests
 *
 * Tests validate the row generation logic: booth creation, numbering,
 * positioning (horizontal + vertical), grid snapping, hall detection,
 * and booth property defaults.
 */

import { mockData } from "@/data/mockData";
import type { Booth, Hall } from "@/types";

// ============================================================
// Extract the pure logic from FloorPlanEditor for testing
// (mirrors the handlePlaceRow callback logic)
// ============================================================

const FT_TO_PX = 5;
const GRID_SPACING_FT = 10;

interface RowConfig {
  numBooths: number;
  boothWidth: number;
  boothDepth: number;
  aisleGap: number;
  prefix: string;
  startNum: number;
  direction: "horizontal" | "vertical";
}

/**
 * Pure function that replicates the row generation logic from FloorPlanEditor.
 * Given a click position in venue-feet, a row config, and hall data,
 * returns the array of new booths (or null if click is outside all halls).
 */
function generateBoothRow(
  venueFtX: number,
  venueFtY: number,
  config: RowConfig,
  halls: Hall[],
  showId: string
): Booth[] | null {
  // Snap to grid
  const snappedVenueX =
    Math.round(venueFtX / GRID_SPACING_FT) * GRID_SPACING_FT;
  const snappedVenueY =
    Math.round(venueFtY / GRID_SPACING_FT) * GRID_SPACING_FT;

  // Find target hall
  let targetHall: Hall | null = null;
  for (const hall of halls) {
    if (
      snappedVenueX >= hall.xFt &&
      snappedVenueX < hall.xFt + hall.widthFt &&
      snappedVenueY >= hall.yFt &&
      snappedVenueY < hall.yFt + hall.heightFt
    ) {
      targetHall = hall;
      break;
    }
  }

  if (!targetHall) return null;

  // Hall-local coordinates
  const hallLocalX = snappedVenueX - targetHall.xFt;
  const hallLocalY = snappedVenueY - targetHall.yFt;

  const timestamp = Date.now();
  const newBooths: Booth[] = [];

  for (let i = 0; i < config.numBooths; i++) {
    const boothNum = config.startNum + i;
    const paddedNum = String(boothNum).padStart(2, "0");

    const xFt =
      config.direction === "horizontal"
        ? hallLocalX + i * config.boothWidth
        : hallLocalX;
    const yFt =
      config.direction === "horizontal"
        ? hallLocalY
        : hallLocalY + i * config.boothDepth;

    newBooths.push({
      id: `booth-NEW-${timestamp}-${i}`,
      number: `${config.prefix}${paddedNum}`,
      hallId: targetHall.id,
      showId,
      pavilionId: "",
      status: "available",
      boothType: "inline",
      xFt,
      yFt,
      widthFt: config.boothWidth,
      heightFt: config.boothDepth,
      price: config.boothWidth * config.boothDepth * 35,
    });
  }

  return newBooths;
}

// ============================================================
// Tests
// ============================================================

const activeShow = mockData.shows[0];
const activeHalls = mockData.halls.filter((h) =>
  activeShow.hallIds.includes(h.id)
);

describe("Ticket 7: Add Row of Booths (Row Generator)", () => {
  // --- Default config (matches the acceptance criteria) ---
  const defaultConfig: RowConfig = {
    numBooths: 8,
    boothWidth: 10,
    boothDepth: 10,
    aisleGap: 8,
    prefix: "T",
    startNum: 1,
    direction: "horizontal",
  };

  // --- Booth generation ---

  test("generates correct number of booths", () => {
    // Click inside East Hall (hall-east: xFt=20, yFt=20, 550x350)
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();
    expect(booths!).toHaveLength(8);
  });

  test("auto-numbers booths with prefix and zero-padded numbers", () => {
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    const numbers = booths!.map((b) => b.number);
    expect(numbers).toEqual(["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08"]);
  });

  test("all generated booths are available and unassigned", () => {
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    for (const b of booths!) {
      expect(b.status).toBe("available");
      expect(b.pavilionId).toBe("");
      expect(b.boothType).toBe("inline");
      expect(b.exhibitorName).toBeUndefined();
    }
  });

  test("booths have correct dimensions and price", () => {
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    for (const b of booths!) {
      expect(b.widthFt).toBe(10);
      expect(b.heightFt).toBe(10);
      expect(b.price).toBe(10 * 10 * 35); // 3500
    }
  });

  test("booths have unique IDs", () => {
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    const ids = booths!.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test("booths are assigned to the correct hall and show", () => {
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    for (const b of booths!) {
      expect(b.hallId).toBe("hall-east");
      expect(b.showId).toBe(activeShow.id);
    }
  });

  // --- Horizontal layout ---

  test("horizontal row: booths are placed side by side along X axis", () => {
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    // All booths should have the same Y
    const yValues = booths!.map((b) => b.yFt);
    expect(new Set(yValues).size).toBe(1);

    // X values should increase by boothWidth
    for (let i = 1; i < booths!.length; i++) {
      expect(booths![i].xFt - booths![i - 1].xFt).toBe(defaultConfig.boothWidth);
    }
  });

  // --- Vertical layout ---

  test("vertical row: booths are stacked along Y axis", () => {
    const vertConfig: RowConfig = { ...defaultConfig, direction: "vertical" };
    const booths = generateBoothRow(100, 100, vertConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    // All booths should have the same X
    const xValues = booths!.map((b) => b.xFt);
    expect(new Set(xValues).size).toBe(1);

    // Y values should increase by boothDepth
    for (let i = 1; i < booths!.length; i++) {
      expect(booths![i].yFt - booths![i - 1].yFt).toBe(vertConfig.boothDepth);
    }
  });

  // --- Grid snapping ---

  test("click position snaps to nearest grid point", () => {
    // Click at 103, 97 — should snap to 100, 100 (grid=10ft)
    const booths = generateBoothRow(103, 97, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    // First booth position should be at grid-snapped hall-local coords
    // Snapped venue: 100, 100. East Hall origin: 20, 20. Hall-local: 80, 80
    expect(booths![0].xFt).toBe(80);
    expect(booths![0].yFt).toBe(80);
  });

  test("exact grid position stays unchanged", () => {
    // Click at exactly 100, 100 — should remain 100, 100
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    // Snapped venue: 100, 100. East Hall origin: 20, 20. Hall-local: 80, 80
    expect(booths![0].xFt).toBe(80);
    expect(booths![0].yFt).toBe(80);
  });

  // --- Hall detection ---

  test("clicking inside West Hall assigns booths to hall-west", () => {
    // West Hall: xFt=620, yFt=20, 550x350
    const booths = generateBoothRow(700, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    for (const b of booths!) {
      expect(b.hallId).toBe("hall-west");
    }
  });

  test("clicking outside all halls returns null", () => {
    // Position 0, 0 is outside all halls (East Hall starts at 20, 20)
    const booths = generateBoothRow(0, 0, defaultConfig, activeHalls, activeShow.id);
    expect(booths).toBeNull();
  });

  test("clicking far outside venue returns null", () => {
    const booths = generateBoothRow(9999, 9999, defaultConfig, activeHalls, activeShow.id);
    expect(booths).toBeNull();
  });

  // --- Custom configurations ---

  test("custom prefix and starting number", () => {
    const config: RowConfig = {
      ...defaultConfig,
      numBooths: 4,
      prefix: "N",
      startNum: 101,
    };
    const booths = generateBoothRow(100, 100, config, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    const numbers = booths!.map((b) => b.number);
    expect(numbers).toEqual(["N101", "N102", "N103", "N104"]);
  });

  test("larger booth sizes produce correct dimensions and pricing", () => {
    const config: RowConfig = {
      ...defaultConfig,
      numBooths: 3,
      boothWidth: 20,
      boothDepth: 20,
    };
    const booths = generateBoothRow(100, 100, config, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    for (const b of booths!) {
      expect(b.widthFt).toBe(20);
      expect(b.heightFt).toBe(20);
      expect(b.price).toBe(20 * 20 * 35); // 14000
    }

    // Horizontal spacing should be 20ft apart
    expect(booths![1].xFt - booths![0].xFt).toBe(20);
    expect(booths![2].xFt - booths![1].xFt).toBe(20);
  });

  test("single booth row works correctly", () => {
    const config: RowConfig = {
      ...defaultConfig,
      numBooths: 1,
      prefix: "S",
      startNum: 1,
    };
    const booths = generateBoothRow(100, 100, config, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();
    expect(booths!).toHaveLength(1);
    expect(booths![0].number).toBe("S01");
  });

  // --- Integration: new booths can coexist with existing mock data ---

  test("generated booths can be appended to existing booth array without ID conflicts", () => {
    const existingIds = new Set(mockData.booths.map((b) => b.id));
    const booths = generateBoothRow(100, 100, defaultConfig, activeHalls, activeShow.id);
    expect(booths).not.toBeNull();

    for (const b of booths!) {
      expect(existingIds.has(b.id)).toBe(false);
    }
  });

  test("getBoothFill returns fallback color for unassigned pavilion", () => {
    // Import and test that empty pavilionId produces the fallback "#666"
    const { getBoothFill } = require("@/utils/boothColors");
    const pavilionMap = new Map(
      mockData.pavilions.map((p) => [p.id, p])
    );

    const unassignedBooth: Booth = {
      id: "test-unassigned",
      number: "T01",
      hallId: "hall-east",
      showId: "show-winter-2027",
      pavilionId: "",
      status: "available",
      boothType: "inline",
      xFt: 80,
      yFt: 80,
      widthFt: 10,
      heightFt: 10,
      price: 3500,
    };

    const fill = getBoothFill(unassignedBooth, pavilionMap, "pavilion");
    expect(fill).toBe("#666");
  });
});
