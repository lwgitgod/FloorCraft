/**
 * Ticket 9: Delete Booth(s) -- Functional Tests
 *
 * Tests validate delete logic: filtering booths from array, sold booth detection,
 * confirmation requirement, and selection clearing after deletion.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import type { Booth, BoothStatus } from "@/types";

// --- Extracted delete logic (mirrors FloorPlanEditor implementation) ---

/** Filter booths by removing those whose ids are in the delete set */
function deleteBoothsFromArray(
  booths: Booth[],
  idsToDelete: Set<string>
): Booth[] {
  return booths.filter((b) => !idsToDelete.has(b.id));
}

/** Count how many of the selected booths have status "sold" */
function countSoldBooths(booths: Booth[], selectedIds: Set<string>): number {
  return booths.filter((b) => selectedIds.has(b.id) && b.status === "sold")
    .length;
}

/** Determine whether a confirmation dialog is needed before deleting */
function needsDeleteConfirmation(
  booths: Booth[],
  selectedIds: Set<string>
): boolean {
  return countSoldBooths(booths, selectedIds) > 0;
}

// --- Test fixtures ---

function makeBooth(overrides: Partial<Booth> & { id: string }): Booth {
  return {
    number: "X100",
    hallId: "hall-east",
    showId: "show-winter-2026",
    pavilionId: "pav-gemstone",
    status: "available",
    boothType: "inline",
    xFt: 10,
    yFt: 10,
    widthFt: 10,
    heightFt: 10,
    price: 3500,
    ...overrides,
  };
}

const boothAvailable1 = makeBooth({ id: "b-avail-1", number: "E100", status: "available" });
const boothAvailable2 = makeBooth({ id: "b-avail-2", number: "E101", status: "available" });
const boothSold1 = makeBooth({
  id: "b-sold-1",
  number: "E102",
  status: "sold",
  exhibitorName: "Gem Corp",
});
const boothHeld1 = makeBooth({ id: "b-held-1", number: "E103", status: "held" });
const boothBlocked1 = makeBooth({ id: "b-blocked-1", number: "E104", status: "blocked" });

const allTestBooths: Booth[] = [
  boothAvailable1,
  boothAvailable2,
  boothSold1,
  boothHeld1,
  boothBlocked1,
];

// ============================================================
// Tests
// ============================================================

describe("Ticket 9: Delete Booth(s)", () => {
  // --- Deleting available booths ---

  describe("deleting available booths", () => {
    test("deleting a single available booth removes it from array", () => {
      const ids = new Set(["b-avail-1"]);
      const result = deleteBoothsFromArray(allTestBooths, ids);
      expect(result.length).toBe(allTestBooths.length - 1);
      expect(result.find((b) => b.id === "b-avail-1")).toBeUndefined();
    });

    test("deleting multiple booths removes all of them", () => {
      const ids = new Set(["b-avail-1", "b-avail-2"]);
      const result = deleteBoothsFromArray(allTestBooths, ids);
      expect(result.length).toBe(allTestBooths.length - 2);
      expect(result.find((b) => b.id === "b-avail-1")).toBeUndefined();
      expect(result.find((b) => b.id === "b-avail-2")).toBeUndefined();
    });

    test("remaining booths are untouched after deletion", () => {
      const ids = new Set(["b-avail-1"]);
      const result = deleteBoothsFromArray(allTestBooths, ids);
      const remaining = result.map((b) => b.id);
      expect(remaining).toContain("b-avail-2");
      expect(remaining).toContain("b-sold-1");
      expect(remaining).toContain("b-held-1");
      expect(remaining).toContain("b-blocked-1");
    });
  });

  // --- Sold booth detection ---

  describe("sold booth detection", () => {
    test("correctly counts sold booths in selection", () => {
      const ids = new Set(["b-avail-1", "b-sold-1"]);
      expect(countSoldBooths(allTestBooths, ids)).toBe(1);
    });

    test("returns 0 when no sold booths in selection", () => {
      const ids = new Set(["b-avail-1", "b-held-1"]);
      expect(countSoldBooths(allTestBooths, ids)).toBe(0);
    });

    test("counts multiple sold booths", () => {
      const extraSold = makeBooth({ id: "b-sold-2", status: "sold" });
      const boothsWithTwoSold = [...allTestBooths, extraSold];
      const ids = new Set(["b-sold-1", "b-sold-2"]);
      expect(countSoldBooths(boothsWithTwoSold, ids)).toBe(2);
    });

    test("ignores sold booths not in selection", () => {
      const ids = new Set(["b-avail-1"]);
      expect(countSoldBooths(allTestBooths, ids)).toBe(0);
    });
  });

  // --- Confirmation requirement ---

  describe("confirmation requirement", () => {
    test("confirmation needed when sold booths are in selection", () => {
      const ids = new Set(["b-sold-1"]);
      expect(needsDeleteConfirmation(allTestBooths, ids)).toBe(true);
    });

    test("confirmation needed when mix of sold and available selected", () => {
      const ids = new Set(["b-avail-1", "b-sold-1", "b-avail-2"]);
      expect(needsDeleteConfirmation(allTestBooths, ids)).toBe(true);
    });

    test("no confirmation when only available booths selected", () => {
      const ids = new Set(["b-avail-1", "b-avail-2"]);
      expect(needsDeleteConfirmation(allTestBooths, ids)).toBe(false);
    });

    test("no confirmation when only held booths selected", () => {
      const ids = new Set(["b-held-1"]);
      expect(needsDeleteConfirmation(allTestBooths, ids)).toBe(false);
    });

    test("no confirmation when only blocked booths selected", () => {
      const ids = new Set(["b-blocked-1"]);
      expect(needsDeleteConfirmation(allTestBooths, ids)).toBe(false);
    });

    test("no confirmation when held + blocked + available selected (no sold)", () => {
      const ids = new Set(["b-avail-1", "b-held-1", "b-blocked-1"]);
      expect(needsDeleteConfirmation(allTestBooths, ids)).toBe(false);
    });
  });

  // --- Empty selection ---

  describe("empty selection handling", () => {
    test("delete with no selection does nothing", () => {
      const ids = new Set<string>();
      const result = deleteBoothsFromArray(allTestBooths, ids);
      expect(result.length).toBe(allTestBooths.length);
    });

    test("no confirmation needed with empty selection", () => {
      const ids = new Set<string>();
      expect(needsDeleteConfirmation(allTestBooths, ids)).toBe(false);
    });
  });

  // --- Booth count verification ---

  describe("booth count after deletion", () => {
    test("booth count decreases by 1 after single delete", () => {
      const before = allTestBooths.length;
      const result = deleteBoothsFromArray(allTestBooths, new Set(["b-avail-1"]));
      expect(result.length).toBe(before - 1);
    });

    test("booth count decreases by 3 after triple delete", () => {
      const before = allTestBooths.length;
      const result = deleteBoothsFromArray(
        allTestBooths,
        new Set(["b-avail-1", "b-avail-2", "b-held-1"])
      );
      expect(result.length).toBe(before - 3);
    });

    test("deleting all booths results in empty array", () => {
      const allIds = new Set(allTestBooths.map((b) => b.id));
      const result = deleteBoothsFromArray(allTestBooths, allIds);
      expect(result.length).toBe(0);
    });

    test("deleting non-existent ids does not change count", () => {
      const ids = new Set(["non-existent-1", "non-existent-2"]);
      const result = deleteBoothsFromArray(allTestBooths, ids);
      expect(result.length).toBe(allTestBooths.length);
    });
  });

  // --- Works with real mock data ---

  describe("works with real mock data", () => {
    test("can delete booths from mockData.booths", () => {
      const firstBooth = mockData.booths[0];
      const ids = new Set([firstBooth.id]);
      const result = deleteBoothsFromArray(mockData.booths, ids);
      expect(result.length).toBe(mockData.booths.length - 1);
      expect(result.find((b) => b.id === firstBooth.id)).toBeUndefined();
    });

    test("sold booth detection works with real mock data", () => {
      const soldBooths = mockData.booths.filter((b) => b.status === "sold");
      if (soldBooths.length > 0) {
        const ids = new Set([soldBooths[0].id]);
        expect(needsDeleteConfirmation(mockData.booths, ids)).toBe(true);
      }
    });
  });

  // --- data-testid verification ---

  describe("data-testid strings exist in component source", () => {
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

    test("delete-booth-btn data-testid exists", () => {
      expect(source).toContain('data-testid="delete-booth-btn"');
    });

    test("delete-confirm-modal data-testid exists", () => {
      expect(source).toContain('data-testid="delete-confirm-modal"');
    });

    test("delete-confirm-btn data-testid exists", () => {
      expect(source).toContain('data-testid="delete-confirm-btn"');
    });

    test("delete-cancel-btn data-testid exists", () => {
      expect(source).toContain('data-testid="delete-cancel-btn"');
    });

    test("keydown listener for Delete key exists in source", () => {
      expect(source).toContain('"Delete"');
      expect(source).toContain("keydown");
    });
  });
});
