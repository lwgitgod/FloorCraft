import { mockData } from "@/data/mockData";
import type { Booth, BoothStatus, Pavilion } from "@/types";
import {
  getBoothFill,
  BLOCKED_COLOR,
  STATUS_COLORS,
  ColorMode,
} from "@/utils/boothColors";

const { venues, halls, pavilions, shows, booths } = mockData;

// --- Data integrity ---

describe("Mock data integrity", () => {
  test("has 3 venues", () => {
    expect(venues).toHaveLength(3);
  });

  test("venues have required fields", () => {
    for (const v of venues) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(["owned", "rental"]).toContain(v.type);
      expect(v.widthFt).toBeGreaterThan(0);
      expect(v.heightFt).toBeGreaterThan(0);
    }
  });

  test("Tucson is owned, LV and SD are rental", () => {
    const tucson = venues.find((v) => v.id === "venue-tucson");
    expect(tucson?.type).toBe("owned");
    const lv = venues.find((v) => v.id === "venue-lv");
    expect(lv?.type).toBe("rental");
    const sd = venues.find((v) => v.id === "venue-sd");
    expect(sd?.type).toBe("rental");
  });

  test("has 5 halls for Tucson", () => {
    const tucsonHalls = halls.filter((h) => h.venueId === "venue-tucson");
    expect(tucsonHalls).toHaveLength(5);
  });

  test("has 6 pavilions with distinct colors", () => {
    expect(pavilions).toHaveLength(6);
    const colors = pavilions.map((p) => p.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(6);
  });

  test("pavilion colors are valid hex", () => {
    for (const p of pavilions) {
      expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test("has 1 show using East Hall, West Hall, and Outdoor Bazaar", () => {
    expect(shows).toHaveLength(1);
    const show = shows[0];
    expect(show.hallIds).toContain("hall-east");
    expect(show.hallIds).toContain("hall-west");
    expect(show.hallIds).toContain("hall-outdoor");
    expect(show.hallIds).toHaveLength(3);
  });
});

// --- Booth data ---

describe("Booth data", () => {
  test("has between 80 and 120 booths", () => {
    expect(booths.length).toBeGreaterThanOrEqual(80);
    expect(booths.length).toBeLessThanOrEqual(120);
  });

  test("all booths have required fields", () => {
    for (const b of booths) {
      expect(b.id).toBeTruthy();
      expect(b.number).toBeTruthy();
      expect(b.hallId).toBeTruthy();
      expect(b.showId).toBeTruthy();
      expect(b.pavilionId).toBeTruthy();
      expect(b.status).toBeTruthy();
      expect(b.xFt).toBeGreaterThanOrEqual(0);
      expect(b.yFt).toBeGreaterThanOrEqual(0);
      expect(b.widthFt).toBeGreaterThan(0);
      expect(b.heightFt).toBeGreaterThan(0);
    }
  });

  test("all booths have valid x/y coordinates and dimensions", () => {
    for (const b of booths) {
      expect(typeof b.xFt).toBe("number");
      expect(typeof b.yFt).toBe("number");
      expect(b.widthFt).toBeGreaterThanOrEqual(10);
      expect(b.heightFt).toBeGreaterThanOrEqual(10);
      // Standard booth sizes
      expect([10, 20]).toContain(b.widthFt);
      expect([10, 20]).toContain(b.heightFt);
    }
  });

  test("booth numbers are unique within the show", () => {
    const showBooths = booths.filter(
      (b) => b.showId === "show-winter-2027"
    );
    const numbers = showBooths.map((b) => b.number);
    const unique = new Set(numbers);
    expect(unique.size).toBe(numbers.length);
  });

  test("all booth pavilion assignments reference valid pavilions", () => {
    const pavilionIds = new Set(pavilions.map((p) => p.id));
    for (const b of booths) {
      expect(pavilionIds.has(b.pavilionId)).toBe(true);
    }
  });

  test("all booths reference valid halls", () => {
    const hallIds = new Set(halls.map((h) => h.id));
    for (const b of booths) {
      expect(hallIds.has(b.hallId)).toBe(true);
    }
  });

  test("sold booths have exhibitor names, others do not", () => {
    for (const b of booths) {
      if (b.status === "sold") {
        expect(b.exhibitorName).toBeTruthy();
      } else {
        expect(b.exhibitorName).toBeUndefined();
      }
    }
  });
});

// --- Status distribution ---

describe("Booth status distribution", () => {
  function countByStatus(status: BoothStatus): number {
    return booths.filter((b) => b.status === status).length;
  }

  const total = booths.length;

  test("approximately 60% sold (45-75%)", () => {
    const pct = countByStatus("sold") / total;
    expect(pct).toBeGreaterThanOrEqual(0.45);
    expect(pct).toBeLessThanOrEqual(0.75);
  });

  test("approximately 20% available (10-35%)", () => {
    const pct = countByStatus("available") / total;
    expect(pct).toBeGreaterThanOrEqual(0.1);
    expect(pct).toBeLessThanOrEqual(0.35);
  });

  test("approximately 10% held (3-20%)", () => {
    const pct = countByStatus("held") / total;
    expect(pct).toBeGreaterThanOrEqual(0.03);
    expect(pct).toBeLessThanOrEqual(0.2);
  });

  test("approximately 10% blocked (3-20%)", () => {
    const pct = countByStatus("blocked") / total;
    expect(pct).toBeGreaterThanOrEqual(0.03);
    expect(pct).toBeLessThanOrEqual(0.2);
  });

  test("all four statuses are present", () => {
    const statuses = new Set(booths.map((b) => b.status));
    expect(statuses.has("sold")).toBe(true);
    expect(statuses.has("available")).toBe(true);
    expect(statuses.has("held")).toBe(true);
    expect(statuses.has("blocked")).toBe(true);
  });
});

// --- Pavilion coverage ---

describe("Pavilion coverage", () => {
  test("all 6 pavilions are assigned to at least one booth", () => {
    const usedPavIds = new Set(booths.map((b) => b.pavilionId));
    for (const p of pavilions) {
      expect(usedPavIds.has(p.id)).toBe(true);
    }
  });

  test("booths are spread across multiple halls", () => {
    const hallsUsed = new Set(booths.map((b) => b.hallId));
    expect(hallsUsed.size).toBeGreaterThanOrEqual(3);
  });
});

// --- Booth color utility (getBoothFill) ---

describe("getBoothFill color utility", () => {
  // Build pavilion map from mock data
  const pavilionMap = new Map<string, Pavilion>(
    pavilions.map((p) => [p.id, p])
  );

  // Helper to create a booth with overrides
  function makeBooth(overrides: Partial<Booth>): Booth {
    return {
      id: "test-booth",
      number: "T001",
      hallId: "hall-east",
      showId: "show-winter-2027",
      pavilionId: pavilions[0].id,
      status: "available",
      boothType: "inline",
      xFt: 0,
      yFt: 0,
      widthFt: 10,
      heightFt: 10,
      price: 500,
      ...overrides,
    };
  }

  describe("pavilion color mode (default)", () => {
    test("returns pavilion color for available booth", () => {
      const booth = makeBooth({ status: "available", pavilionId: pavilions[0].id });
      expect(getBoothFill(booth, pavilionMap)).toBe(pavilions[0].color);
    });

    test("returns pavilion color for sold booth", () => {
      const booth = makeBooth({ status: "sold", pavilionId: pavilions[1].id, exhibitorName: "Test Co" });
      expect(getBoothFill(booth, pavilionMap, "pavilion")).toBe(pavilions[1].color);
    });

    test("returns pavilion color for held booth", () => {
      const booth = makeBooth({ status: "held", pavilionId: pavilions[2].id });
      expect(getBoothFill(booth, pavilionMap, "pavilion")).toBe(pavilions[2].color);
    });

    test("returns BLOCKED_COLOR (#555566) for blocked booths regardless of pavilion", () => {
      const booth = makeBooth({ status: "blocked", pavilionId: pavilions[0].id });
      expect(getBoothFill(booth, pavilionMap, "pavilion")).toBe(BLOCKED_COLOR);
      expect(getBoothFill(booth, pavilionMap, "pavilion")).toBe("#555566");
    });

    test("returns fallback #666 for unknown pavilion ID", () => {
      const booth = makeBooth({ pavilionId: "pav-nonexistent" });
      expect(getBoothFill(booth, pavilionMap, "pavilion")).toBe("#666");
    });

    test("defaults to pavilion mode when colorMode is omitted", () => {
      const booth = makeBooth({ pavilionId: pavilions[3].id });
      expect(getBoothFill(booth, pavilionMap)).toBe(pavilions[3].color);
    });
  });

  describe("status color mode", () => {
    test("returns green (#22c55e) for available", () => {
      const booth = makeBooth({ status: "available" });
      expect(getBoothFill(booth, pavilionMap, "status")).toBe("#22c55e");
    });

    test("returns red (#ef4444) for sold", () => {
      const booth = makeBooth({ status: "sold", exhibitorName: "Test" });
      expect(getBoothFill(booth, pavilionMap, "status")).toBe("#ef4444");
    });

    test("returns yellow (#eab308) for held", () => {
      const booth = makeBooth({ status: "held" });
      expect(getBoothFill(booth, pavilionMap, "status")).toBe("#eab308");
    });

    test("returns gray (#6b7280) for blocked", () => {
      const booth = makeBooth({ status: "blocked" });
      expect(getBoothFill(booth, pavilionMap, "status")).toBe("#6b7280");
    });

    test("ignores pavilion color in status mode", () => {
      for (const pav of pavilions) {
        const booth = makeBooth({ status: "available", pavilionId: pav.id });
        // In status mode, all available booths get the same green regardless of pavilion
        expect(getBoothFill(booth, pavilionMap, "status")).toBe(STATUS_COLORS.available);
      }
    });
  });

  describe("STATUS_COLORS constant", () => {
    test("has entries for all four statuses", () => {
      expect(STATUS_COLORS.available).toBeDefined();
      expect(STATUS_COLORS.sold).toBeDefined();
      expect(STATUS_COLORS.held).toBeDefined();
      expect(STATUS_COLORS.blocked).toBeDefined();
    });

    test("all status colors are valid hex", () => {
      for (const color of Object.values(STATUS_COLORS)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe("integration with mock data", () => {
    test("every booth in mock data resolves to a valid color in pavilion mode", () => {
      for (const booth of booths) {
        const fill = getBoothFill(booth, pavilionMap, "pavilion");
        expect(fill).toMatch(/^#[0-9a-fA-F]{3,6}$/);
      }
    });

    test("every booth in mock data resolves to a valid color in status mode", () => {
      for (const booth of booths) {
        const fill = getBoothFill(booth, pavilionMap, "status");
        expect(fill).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    test("blocked booths get different colors in pavilion vs status mode", () => {
      const blockedBooth = booths.find((b) => b.status === "blocked");
      expect(blockedBooth).toBeDefined();
      const pavFill = getBoothFill(blockedBooth!, pavilionMap, "pavilion");
      const statusFill = getBoothFill(blockedBooth!, pavilionMap, "status");
      expect(pavFill).toBe(BLOCKED_COLOR);
      expect(statusFill).toBe(STATUS_COLORS.blocked);
      // These two grays are intentionally different
      expect(pavFill).not.toBe(statusFill);
    });
  });
});
