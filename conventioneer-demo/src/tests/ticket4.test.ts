/**
 * Ticket 4: Toolbar + Pavilion Legend — Functional Tests
 *
 * Tests validate mock data structure, STATUS_COLORS constant,
 * getBoothFill logic for both color modes, and stats computation.
 */

import { mockData } from "@/data/mockData";
import { STATUS_COLORS, getBoothFill } from "@/utils/boothColors";
import type { Booth, Pavilion, BoothStatus } from "@/types";

// Build pavilion map for tests
function buildPavilionMap(pavilions: Pavilion[]): Map<string, Pavilion> {
  const map = new Map<string, Pavilion>();
  for (const p of pavilions) map.set(p.id, p);
  return map;
}

describe("Ticket 4: Toolbar + Pavilion Legend", () => {
  // --- Mock data validation ---

  test("mockData has all 6 pavilions with colors and codes", () => {
    expect(mockData.pavilions).toHaveLength(6);
    const expectedCodes = ["AMB", "SWT", "GEM", "SLV", "DES", "OUT"];
    const codes = mockData.pavilions.map((p) => p.code);
    for (const code of expectedCodes) {
      expect(codes).toContain(code);
    }
    for (const p of mockData.pavilions) {
      expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.code).toBeTruthy();
      expect(p.name).toBeTruthy();
    }
  });

  test("all pavilion names are present for the legend", () => {
    const expectedNames = [
      "Amber Pavilion",
      "Southwest / Turquoise Pavilion",
      "International Gemstone Pavilion",
      "Silver Jewelry Pavilion",
      "Designer Jewelry Pavilion",
      "Outdoor Dealers Pavilion",
    ];
    const names = mockData.pavilions.map((p) => p.name);
    for (const name of expectedNames) {
      expect(names).toContain(name);
    }
  });

  // --- STATUS_COLORS ---

  test("STATUS_COLORS has all 4 status colors", () => {
    expect(STATUS_COLORS).toHaveProperty("available");
    expect(STATUS_COLORS).toHaveProperty("sold");
    expect(STATUS_COLORS).toHaveProperty("held");
    expect(STATUS_COLORS).toHaveProperty("blocked");
    // Each should be a valid hex color
    for (const color of Object.values(STATUS_COLORS)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  // --- getBoothFill ---

  test("getBoothFill returns pavilion color in pavilion mode", () => {
    const pavilionMap = buildPavilionMap(mockData.pavilions);
    const booth: Booth = {
      id: "test-1",
      number: "T100",
      hallId: "hall-east",
      showId: "show-winter-2027",
      pavilionId: "pav-amber",
      status: "sold",
      boothType: "inline",
      xFt: 0,
      yFt: 0,
      widthFt: 10,
      heightFt: 10,
      price: 3500,
    };
    const fill = getBoothFill(booth, pavilionMap, "pavilion");
    expect(fill).toBe("#D4920B"); // Amber Pavilion color
  });

  test("getBoothFill returns status color in status mode for all statuses", () => {
    const pavilionMap = buildPavilionMap(mockData.pavilions);
    const statuses: BoothStatus[] = ["available", "sold", "held", "blocked"];
    for (const status of statuses) {
      const booth: Booth = {
        id: `test-${status}`,
        number: "T100",
        hallId: "hall-east",
        showId: "show-winter-2027",
        pavilionId: "pav-amber",
        status,
        boothType: "inline",
        xFt: 0,
        yFt: 0,
        widthFt: 10,
        heightFt: 10,
        price: 3500,
      };
      const fill = getBoothFill(booth, pavilionMap, "status");
      expect(fill).toBe(STATUS_COLORS[status]);
    }
  });

  test("getBoothFill returns blocked color for blocked booths in pavilion mode", () => {
    const pavilionMap = buildPavilionMap(mockData.pavilions);
    const booth: Booth = {
      id: "test-blocked",
      number: "T100",
      hallId: "hall-east",
      showId: "show-winter-2027",
      pavilionId: "pav-amber",
      status: "blocked",
      boothType: "inline",
      xFt: 0,
      yFt: 0,
      widthFt: 10,
      heightFt: 10,
      price: 3500,
    };
    const fill = getBoothFill(booth, pavilionMap, "pavilion");
    expect(fill).toBe("#555566"); // BLOCKED_COLOR
  });

  // --- Stats ---

  test("booth status counts are computed correctly from mock data", () => {
    const activeShow = mockData.shows[0];
    const activeHallIds = new Set(activeShow.hallIds);
    const activeBooths = mockData.booths.filter((b) =>
      activeHallIds.has(b.hallId)
    );

    const counts = { sold: 0, available: 0, held: 0, blocked: 0 };
    for (const b of activeBooths) {
      counts[b.status]++;
    }

    // Verify every booth has a valid status
    for (const b of activeBooths) {
      expect(["sold", "available", "held", "blocked"]).toContain(b.status);
    }

    // Verify counts are positive (deterministic seed guarantees a mix)
    expect(counts.sold).toBeGreaterThan(0);
    expect(counts.available).toBeGreaterThan(0);
    expect(activeBooths.length).toBeGreaterThan(0);
  });

  test("stats math adds up: total = sold + available + held + blocked", () => {
    const activeShow = mockData.shows[0];
    const activeHallIds = new Set(activeShow.hallIds);
    const activeBooths = mockData.booths.filter((b) =>
      activeHallIds.has(b.hallId)
    );

    const counts = { sold: 0, available: 0, held: 0, blocked: 0 };
    for (const b of activeBooths) {
      counts[b.status]++;
    }

    const total = counts.sold + counts.available + counts.held + counts.blocked;
    expect(total).toBe(activeBooths.length);
  });
});
