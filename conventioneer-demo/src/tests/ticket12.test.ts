/**
 * Ticket 12: Search + Highlight -- Functional Tests
 *
 * Tests validate search matching logic, search result counting,
 * auto-pan coordinate computation, and clear/reset behavior.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import type { Booth, Hall } from "@/types";

// --- Constants (mirrored from FloorPlanEditor) ---
const FT_TO_PX = 5;
const PANEL_WIDTH = 320;

// --- Helpers: extracted search logic from FloorPlanEditor ---

/** Match booths by booth number or exhibitor name (case-insensitive substring match) */
function searchBooths(booths: Booth[], query: string): Set<string> {
  const q = query.trim().toLowerCase();
  if (!q) return new Set();

  const matches = new Set<string>();
  for (const booth of booths) {
    const numberMatch = booth.number.toLowerCase().includes(q);
    const nameMatch = booth.exhibitorName
      ? booth.exhibitorName.toLowerCase().includes(q)
      : false;
    if (numberMatch || nameMatch) {
      matches.add(booth.id);
    }
  }
  return matches;
}

/** Compute the world-pixel center of a booth given its hall */
function getBoothCenterWorldPx(
  booth: Booth,
  hall: Hall
): { x: number; y: number } {
  return {
    x: (hall.xFt + booth.xFt + booth.widthFt / 2) * FT_TO_PX,
    y: (hall.yFt + booth.yFt + booth.heightFt / 2) * FT_TO_PX,
  };
}

/** Compute the pan position to center a booth in the viewport */
function computeAutoPanPosition(
  boothCenterWorldPx: { x: number; y: number },
  viewportWidth: number,
  viewportHeight: number,
  targetScale: number
): { x: number; y: number } {
  return {
    x: viewportWidth / 2 - boothCenterWorldPx.x * targetScale,
    y: viewportHeight / 2 - boothCenterWorldPx.y * targetScale,
  };
}

/** Compute search-adjusted opacity for a booth */
function getSearchOpacity(
  boothId: string,
  searchActive: boolean,
  matchIds: Set<string>,
  baseOpacity: number
): number {
  if (!searchActive) return baseOpacity;
  return matchIds.has(boothId) ? baseOpacity : 0.3;
}

// --- Test fixtures ---

const activeShow = mockData.shows[0];
const activeHallIds = new Set(activeShow.hallIds);
const activeBooths = mockData.booths.filter((b) => activeHallIds.has(b.hallId));

function buildHallMap(): Map<string, Hall> {
  const map = new Map<string, Hall>();
  for (const h of mockData.halls) map.set(h.id, h);
  return map;
}

const hallMap = buildHallMap();

// ============================================================
// Tests
// ============================================================

describe("Ticket 12: Search + Highlight", () => {
  // --- Search matching ---

  describe("search matching", () => {
    test("empty query returns no matches", () => {
      const matches = searchBooths(activeBooths, "");
      expect(matches.size).toBe(0);
    });

    test("whitespace-only query returns no matches", () => {
      const matches = searchBooths(activeBooths, "   ");
      expect(matches.size).toBe(0);
    });

    test("searching by exact booth number finds the booth", () => {
      // First booth in mock data should have number starting with E or W
      const firstBooth = activeBooths[0];
      const matches = searchBooths(activeBooths, firstBooth.number);
      expect(matches.has(firstBooth.id)).toBe(true);
    });

    test("searching by booth number prefix returns multiple matches", () => {
      // All East Hall booths start with "E"
      const matches = searchBooths(activeBooths, "E1");
      expect(matches.size).toBeGreaterThan(0);
      // All matches should be booths with number containing "E1"
      for (const id of matches) {
        const booth = activeBooths.find((b) => b.id === id)!;
        expect(booth.number.toLowerCase()).toContain("e1");
      }
    });

    test("searching by exhibitor name finds the booth", () => {
      // Find a sold booth with an exhibitor name
      const soldBooth = activeBooths.find(
        (b) => b.status === "sold" && b.exhibitorName
      );
      expect(soldBooth).toBeDefined();

      const matches = searchBooths(activeBooths, soldBooth!.exhibitorName!);
      expect(matches.has(soldBooth!.id)).toBe(true);
    });

    test("search is case-insensitive for booth numbers", () => {
      const firstBooth = activeBooths[0];
      const lowerMatches = searchBooths(
        activeBooths,
        firstBooth.number.toLowerCase()
      );
      const upperMatches = searchBooths(
        activeBooths,
        firstBooth.number.toUpperCase()
      );
      expect(lowerMatches.size).toBe(upperMatches.size);
      for (const id of lowerMatches) {
        expect(upperMatches.has(id)).toBe(true);
      }
    });

    test("search is case-insensitive for exhibitor names", () => {
      const soldBooth = activeBooths.find(
        (b) => b.status === "sold" && b.exhibitorName
      )!;
      const name = soldBooth.exhibitorName!;

      const lowerMatches = searchBooths(activeBooths, name.toLowerCase());
      const upperMatches = searchBooths(activeBooths, name.toUpperCase());
      expect(lowerMatches.size).toBe(upperMatches.size);
    });

    test("partial exhibitor name matches", () => {
      const soldBooth = activeBooths.find(
        (b) => b.status === "sold" && b.exhibitorName
      )!;
      // Use just the first 4 characters
      const partial = soldBooth.exhibitorName!.slice(0, 4);
      const matches = searchBooths(activeBooths, partial);
      expect(matches.has(soldBooth.id)).toBe(true);
    });

    test("nonsense query returns no matches", () => {
      const matches = searchBooths(activeBooths, "ZZZZXYZ999");
      expect(matches.size).toBe(0);
    });

    test("available booths (no exhibitor) are not matched by name", () => {
      const availableBooth = activeBooths.find(
        (b) => b.status === "available"
      );
      if (availableBooth) {
        // Searching for "Available" should not match the booth (it has no exhibitorName)
        const matches = searchBooths(activeBooths, "somefakename");
        expect(matches.has(availableBooth.id)).toBe(false);
      }
    });
  });

  // --- Search opacity/dimming ---

  describe("search dimming", () => {
    test("when search is inactive, base opacity is used", () => {
      const opacity = getSearchOpacity("booth-1", false, new Set(), 0.9);
      expect(opacity).toBe(0.9);
    });

    test("matching booth keeps base opacity during active search", () => {
      const matchIds = new Set(["booth-1"]);
      const opacity = getSearchOpacity("booth-1", true, matchIds, 0.9);
      expect(opacity).toBe(0.9);
    });

    test("non-matching booth gets 0.3 opacity during active search", () => {
      const matchIds = new Set(["booth-1"]);
      const opacity = getSearchOpacity("booth-2", true, matchIds, 0.9);
      expect(opacity).toBe(0.3);
    });

    test("dimmed opacity is always 0.3 regardless of base opacity", () => {
      const matchIds = new Set(["booth-1"]);
      expect(getSearchOpacity("booth-2", true, matchIds, 0.55)).toBe(0.3);
      expect(getSearchOpacity("booth-2", true, matchIds, 0.7)).toBe(0.3);
      expect(getSearchOpacity("booth-2", true, matchIds, 0.9)).toBe(0.3);
    });
  });

  // --- Auto-pan computation ---

  describe("auto-pan to first match", () => {
    test("booth center is computed correctly in world pixels", () => {
      const booth = activeBooths[0];
      const hall = hallMap.get(booth.hallId)!;
      const center = getBoothCenterWorldPx(booth, hall);

      const expectedX =
        (hall.xFt + booth.xFt + booth.widthFt / 2) * FT_TO_PX;
      const expectedY =
        (hall.yFt + booth.yFt + booth.heightFt / 2) * FT_TO_PX;

      expect(center.x).toBe(expectedX);
      expect(center.y).toBe(expectedY);
    });

    test("pan position centers booth in viewport", () => {
      const boothCenter = { x: 500, y: 300 };
      const vpWidth = 1200;
      const vpHeight = 800;
      const targetScale = 0.5;

      const pos = computeAutoPanPosition(
        boothCenter,
        vpWidth,
        vpHeight,
        targetScale
      );

      // The booth center in screen coords should equal viewport center
      // screenX = pos.x + boothCenter.x * targetScale
      const screenX = pos.x + boothCenter.x * targetScale;
      const screenY = pos.y + boothCenter.y * targetScale;

      expect(screenX).toBe(vpWidth / 2);
      expect(screenY).toBe(vpHeight / 2);
    });

    test("scale is clamped to at least 0.4", () => {
      const currentScale = 0.15; // typical starting zoom
      const targetScale = Math.max(currentScale, 0.4);
      expect(targetScale).toBe(0.4);
    });

    test("scale stays the same if already >= 0.4", () => {
      const currentScale = 0.8;
      const targetScale = Math.max(currentScale, 0.4);
      expect(targetScale).toBe(0.8);
    });
  });

  // --- Search result count ---

  describe("search result count", () => {
    test("searching 'E' returns all East Hall booths", () => {
      const matches = searchBooths(activeBooths, "E");
      const eastBooths = activeBooths.filter((b) =>
        b.number.toLowerCase().includes("e")
      );
      // Count may include exhibitor name matches too
      expect(matches.size).toBeGreaterThanOrEqual(eastBooths.length);
    });

    test("specific exhibitor search returns exactly 1 match", () => {
      // Find a unique exhibitor name
      const soldBooths = activeBooths.filter(
        (b) => b.status === "sold" && b.exhibitorName
      );
      // Use a full unique exhibitor name
      if (soldBooths.length > 0) {
        const target = soldBooths[0];
        const fullName = target.exhibitorName!;
        const matches = searchBooths(activeBooths, fullName);
        // At least one match
        expect(matches.size).toBeGreaterThanOrEqual(1);
        expect(matches.has(target.id)).toBe(true);
      }
    });
  });

  // --- Clear search ---

  describe("clear search behavior", () => {
    test("clearing search returns empty match set", () => {
      // Simulate: had a search, then cleared
      const matchesBefore = searchBooths(activeBooths, "E1");
      expect(matchesBefore.size).toBeGreaterThan(0);

      const matchesAfter = searchBooths(activeBooths, "");
      expect(matchesAfter.size).toBe(0);
    });

    test("searchActive is false when query is empty", () => {
      const searchQuery = "";
      const searchActive = searchQuery.trim().length > 0;
      expect(searchActive).toBe(false);
    });

    test("searchActive is true when query has content", () => {
      const searchQuery = "E1";
      const searchActive = searchQuery.trim().length > 0;
      expect(searchActive).toBe(true);
    });
  });

  // --- UI element existence (static source check) ---

  describe("UI elements exist in source", () => {
    test("search-input data-testid exists in FloorPlanEditor", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain('data-testid="search-input"');
    });

    test("search-clear data-testid exists in FloorPlanEditor", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain('data-testid="search-clear"');
    });

    test("search-result-count data-testid exists in FloorPlanEditor", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain('data-testid="search-result-count"');
    });

    test("search glow ring uses shadowColor for pulsing effect", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain("shadowColor");
      expect(source).toContain("glowPhase");
      expect(source).toContain("glowIntensity");
    });

    test("search dimming applies 0.3 opacity to non-matching booths", () => {
      const fs = require("fs");
      const source = fs.readFileSync(
        require("path").resolve(
          __dirname,
          "../components/FloorPlanEditor.tsx"
        ),
        "utf-8"
      );
      expect(source).toContain("isSearchDimmed ? 0.3");
    });
  });

  // --- Mock data has the right shape for search ---

  describe("mock data supports search", () => {
    test("at least some booths have exhibitor names", () => {
      const withNames = activeBooths.filter((b) => b.exhibitorName);
      expect(withNames.length).toBeGreaterThan(0);
    });

    test("all booths have booth numbers", () => {
      for (const b of activeBooths) {
        expect(b.number).toBeTruthy();
        expect(b.number.length).toBeGreaterThan(0);
      }
    });

    test("booth numbers follow prefix + number pattern", () => {
      for (const b of activeBooths) {
        expect(b.number).toMatch(/^[A-Z]\d+$/);
      }
    });
  });
});
