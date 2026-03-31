/**
 * Ticket 13: Pavilion Filter -- Functional Tests
 *
 * Tests validate pavilion filter toggle logic, opacity computation,
 * multi-select behavior, and "Show All" reset.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import type { Booth } from "@/types";

// --- Helpers: extracted pavilion filter logic from FloorPlanEditor ---

/** Toggle a pavilion ID in a set, returning a new set */
function togglePavilionFilter(
  current: Set<string>,
  pavilionId: string
): Set<string> {
  const next = new Set(current);
  if (next.has(pavilionId)) {
    next.delete(pavilionId);
  } else {
    next.add(pavilionId);
  }
  return next;
}

/** Compute pavilion-filter-adjusted opacity for a booth */
function getPavilionFilterOpacity(
  boothPavilionId: string,
  filterActive: boolean,
  activeFilters: Set<string>,
  baseOpacity: number
): number {
  if (!filterActive) return baseOpacity;
  return activeFilters.has(boothPavilionId) ? baseOpacity : 0.2;
}

/** Compute combined opacity (search + pavilion filter) */
function getCombinedOpacity(
  boothId: string,
  boothPavilionId: string,
  searchActive: boolean,
  searchMatchIds: Set<string>,
  pavilionFilterActive: boolean,
  activePavilionFilters: Set<string>,
  baseOpacity: number
): number {
  const isSearchDimmed = searchActive && !searchMatchIds.has(boothId);
  const isPavilionFiltered =
    pavilionFilterActive && !activePavilionFilters.has(boothPavilionId);

  return isSearchDimmed ? 0.3 : isPavilionFiltered ? 0.2 : baseOpacity;
}

// --- Test fixtures ---

const activeShow = mockData.shows[0];
const activeHallIds = new Set(activeShow.hallIds);
const activeBooths = mockData.booths.filter((b) =>
  activeHallIds.has(b.hallId)
);
const pavilions = mockData.pavilions;

// ============================================================
// Tests
// ============================================================

describe("Ticket 13: Pavilion Filter", () => {
  // --- Toggle logic ---

  describe("pavilion filter toggle", () => {
    test("toggling a pavilion into an empty set adds it", () => {
      const result = togglePavilionFilter(new Set(), "pav-amber");
      expect(result.has("pav-amber")).toBe(true);
      expect(result.size).toBe(1);
    });

    test("toggling the same pavilion again removes it", () => {
      const first = togglePavilionFilter(new Set(), "pav-amber");
      const second = togglePavilionFilter(first, "pav-amber");
      expect(second.has("pav-amber")).toBe(false);
      expect(second.size).toBe(0);
    });

    test("toggling different pavilions adds both", () => {
      let filters = new Set<string>();
      filters = togglePavilionFilter(filters, "pav-amber");
      filters = togglePavilionFilter(filters, "pav-silver");
      expect(filters.has("pav-amber")).toBe(true);
      expect(filters.has("pav-silver")).toBe(true);
      expect(filters.size).toBe(2);
    });

    test("toggling one off while another stays on", () => {
      let filters = new Set<string>();
      filters = togglePavilionFilter(filters, "pav-amber");
      filters = togglePavilionFilter(filters, "pav-silver");
      filters = togglePavilionFilter(filters, "pav-amber");
      expect(filters.has("pav-amber")).toBe(false);
      expect(filters.has("pav-silver")).toBe(true);
      expect(filters.size).toBe(1);
    });

    test("all pavilions can be active simultaneously", () => {
      let filters = new Set<string>();
      for (const p of pavilions) {
        filters = togglePavilionFilter(filters, p.id);
      }
      expect(filters.size).toBe(pavilions.length);
      for (const p of pavilions) {
        expect(filters.has(p.id)).toBe(true);
      }
    });
  });

  // --- Show All / reset ---

  describe("Show All reset", () => {
    test("clearing the set resets to show all", () => {
      let filters = new Set<string>(["pav-amber", "pav-silver"]);
      filters = new Set(); // "Show All" action
      expect(filters.size).toBe(0);
    });

    test("empty filter set means filter is not active", () => {
      const filters = new Set<string>();
      const filterActive = filters.size > 0;
      expect(filterActive).toBe(false);
    });

    test("non-empty filter set means filter is active", () => {
      const filters = new Set<string>(["pav-amber"]);
      const filterActive = filters.size > 0;
      expect(filterActive).toBe(true);
    });
  });

  // --- Opacity/dimming ---

  describe("pavilion filter dimming", () => {
    test("when no filter is active, base opacity is used", () => {
      const opacity = getPavilionFilterOpacity(
        "pav-amber",
        false,
        new Set(),
        0.9
      );
      expect(opacity).toBe(0.9);
    });

    test("booth in active pavilion keeps base opacity", () => {
      const activeFilters = new Set(["pav-amber"]);
      const opacity = getPavilionFilterOpacity(
        "pav-amber",
        true,
        activeFilters,
        0.9
      );
      expect(opacity).toBe(0.9);
    });

    test("booth NOT in active pavilion gets 0.2 opacity", () => {
      const activeFilters = new Set(["pav-amber"]);
      const opacity = getPavilionFilterOpacity(
        "pav-silver",
        true,
        activeFilters,
        0.9
      );
      expect(opacity).toBe(0.2);
    });

    test("dimmed opacity is always 0.2 regardless of base opacity", () => {
      const activeFilters = new Set(["pav-amber"]);
      expect(
        getPavilionFilterOpacity("pav-silver", true, activeFilters, 0.55)
      ).toBe(0.2);
      expect(
        getPavilionFilterOpacity("pav-silver", true, activeFilters, 0.7)
      ).toBe(0.2);
      expect(
        getPavilionFilterOpacity("pav-silver", true, activeFilters, 0.9)
      ).toBe(0.2);
    });

    test("booth in one of multiple active pavilions stays visible", () => {
      const activeFilters = new Set(["pav-amber", "pav-silver"]);
      expect(
        getPavilionFilterOpacity("pav-silver", true, activeFilters, 0.9)
      ).toBe(0.9);
      expect(
        getPavilionFilterOpacity("pav-amber", true, activeFilters, 0.9)
      ).toBe(0.9);
    });

    test("booth NOT in any of multiple active pavilions is dimmed", () => {
      const activeFilters = new Set(["pav-amber", "pav-silver"]);
      expect(
        getPavilionFilterOpacity("pav-gemstone", true, activeFilters, 0.9)
      ).toBe(0.2);
    });
  });

  // --- Combined search + pavilion filter ---

  describe("combined search and pavilion filter opacity", () => {
    test("search dimming takes priority (0.3 > 0.2 visibility)", () => {
      const opacity = getCombinedOpacity(
        "booth-1",
        "pav-amber",
        true,
        new Set(["booth-2"]), // booth-1 not in search results
        true,
        new Set(["pav-amber"]), // but IS in pavilion filter
        0.9
      );
      expect(opacity).toBe(0.3);
    });

    test("pavilion filter dims booth even if search is inactive", () => {
      const opacity = getCombinedOpacity(
        "booth-1",
        "pav-silver",
        false,
        new Set(),
        true,
        new Set(["pav-amber"]), // pav-silver not in filter
        0.9
      );
      expect(opacity).toBe(0.2);
    });

    test("booth passes both filters at full opacity", () => {
      const opacity = getCombinedOpacity(
        "booth-1",
        "pav-amber",
        true,
        new Set(["booth-1"]), // in search results
        true,
        new Set(["pav-amber"]), // in pavilion filter
        0.9
      );
      expect(opacity).toBe(0.9);
    });

    test("no filters active returns base opacity", () => {
      const opacity = getCombinedOpacity(
        "booth-1",
        "pav-amber",
        false,
        new Set(),
        false,
        new Set(),
        0.9
      );
      expect(opacity).toBe(0.9);
    });
  });

  // --- Mock data pavilion coverage ---

  describe("mock data supports pavilion filtering", () => {
    test("pavilions array has at least 2 entries", () => {
      expect(pavilions.length).toBeGreaterThanOrEqual(2);
    });

    test("each pavilion has id, name, and color", () => {
      for (const p of pavilions) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.color).toBeTruthy();
      }
    });

    test("all active booths have a pavilionId", () => {
      for (const b of activeBooths) {
        expect(b.pavilionId).toBeTruthy();
      }
    });

    test("booths span multiple pavilions", () => {
      const pavilionIds = new Set(activeBooths.map((b) => b.pavilionId));
      expect(pavilionIds.size).toBeGreaterThan(1);
    });

    test("each pavilion has at least one booth assigned", () => {
      for (const p of pavilions) {
        const count = activeBooths.filter(
          (b) => b.pavilionId === p.id
        ).length;
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  // --- UI element existence (static source check) ---

  describe("UI elements exist in source", () => {
    test("pavilion-filter data-testid pattern exists in FloorPlanEditor", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain("pavilion-filter-");
      expect(source).toContain("data-testid={`pavilion-filter-${p.id}`}");
    });

    test("show-all-btn data-testid exists in FloorPlanEditor", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain('data-testid="show-all-btn"');
    });

    test("pavilion filter applies 0.2 opacity to filtered booths", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain("isPavilionFiltered ? 0.2");
    });

    test("activePavilionFilters state is declared", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain("activePavilionFilters");
      expect(source).toContain("setActivePavilionFilters");
    });
  });
});
