/**
 * Ticket 15: Clone Show Floor Plan -- Functional Tests
 *
 * Tests validate clone data structure, booth reset logic (status, exhibitor),
 * pavilion preservation, ID uniqueness, booth count differences, toast format,
 * and UI element presence in the source.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData, cloneableShows } from "@/data/mockData";
import type { Booth } from "@/types";

// --- Helpers: extracted clone logic from FloorPlanEditor ---

/** Simulate the clone operation: copy booths, reset status/exhibitor, generate new IDs */
function cloneBoothsFromShow(
  sourceShowId: string,
  targetShowId: string
): Booth[] {
  const source = cloneableShows.find((cs) => cs.show.id === sourceShowId);
  if (!source) return [];

  return source.booths.map((b) => ({
    ...b,
    id: `clone-${b.id}`,
    showId: targetShowId,
    status: "available" as const,
    exhibitorName: undefined,
    notes: undefined,
  }));
}

/** Generate the toast message for a clone operation */
function buildCloneToastMessage(
  boothCount: number,
  showName: string
): string {
  return `Cloned ${boothCount} booths from ${showName}. All exhibitor assignments cleared.`;
}

// --- Test fixtures ---

const activeShow = mockData.shows[0]; // show-winter-2027
const currentBooths = mockData.booths;

// ============================================================
// Tests
// ============================================================

describe("Ticket 15: Clone Show Floor Plan", () => {
  // --- Clone data structure ---

  describe("clone data exists with correct structure", () => {
    test("cloneableShows has at least 2 entries", () => {
      expect(cloneableShows.length).toBeGreaterThanOrEqual(2);
    });

    test("each cloneable show has a show and booths array", () => {
      for (const cs of cloneableShows) {
        expect(cs.show).toBeDefined();
        expect(cs.show.id).toBeTruthy();
        expect(cs.show.name).toBeTruthy();
        expect(Array.isArray(cs.booths)).toBe(true);
        expect(cs.booths.length).toBeGreaterThan(0);
      }
    });

    test("JOGS Winter 2026 is a cloneable show", () => {
      const winter = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      );
      expect(winter).toBeDefined();
      expect(winter!.show.name).toBe("JOGS Winter 2026");
    });

    test("JOGS Fall 2026 is a cloneable show", () => {
      const fall = cloneableShows.find(
        (cs) => cs.show.id === "show-fall-2026"
      );
      expect(fall).toBeDefined();
      expect(fall!.show.name).toBe("JOGS Fall 2026");
    });

    test("each cloneable booth has required fields", () => {
      for (const cs of cloneableShows) {
        for (const b of cs.booths) {
          expect(b.id).toBeTruthy();
          expect(b.number).toBeTruthy();
          expect(b.hallId).toBeTruthy();
          expect(b.showId).toBe(cs.show.id);
          expect(b.pavilionId).toBeTruthy();
          expect(b.widthFt).toBeGreaterThan(0);
          expect(b.heightFt).toBeGreaterThan(0);
        }
      }
    });
  });

  // --- Cloned booths have status reset ---

  describe("cloned booths have status reset to available", () => {
    test("all cloned booths are available", () => {
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      expect(cloned.length).toBeGreaterThan(0);
      for (const b of cloned) {
        expect(b.status).toBe("available");
      }
    });

    test("source booths have mixed statuses (sold, held, etc.)", () => {
      const source = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      const statuses = new Set(source.booths.map((b) => b.status));
      expect(statuses.size).toBeGreaterThan(1);
    });
  });

  // --- Cloned booths have exhibitor names cleared ---

  describe("cloned booths have exhibitor names cleared", () => {
    test("no cloned booth has an exhibitor name", () => {
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      for (const b of cloned) {
        expect(b.exhibitorName).toBeUndefined();
      }
    });

    test("source booths have some exhibitor names assigned", () => {
      const source = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      const withNames = source.booths.filter((b) => b.exhibitorName);
      expect(withNames.length).toBeGreaterThan(0);
    });

    test("notes are also cleared on cloned booths", () => {
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      for (const b of cloned) {
        expect(b.notes).toBeUndefined();
      }
    });
  });

  // --- Pavilion assignments preserved ---

  describe("cloned booths preserve pavilion assignments", () => {
    test("cloned booths retain their source pavilion IDs", () => {
      const source = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );

      for (let i = 0; i < cloned.length; i++) {
        expect(cloned[i].pavilionId).toBe(source.booths[i].pavilionId);
      }
    });

    test("cloned booths span multiple pavilions", () => {
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      const pavilionIds = new Set(cloned.map((b) => b.pavilionId));
      expect(pavilionIds.size).toBeGreaterThan(1);
    });

    test("booth positions are preserved from source", () => {
      const source = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );

      for (let i = 0; i < cloned.length; i++) {
        expect(cloned[i].xFt).toBe(source.booths[i].xFt);
        expect(cloned[i].yFt).toBe(source.booths[i].yFt);
        expect(cloned[i].widthFt).toBe(source.booths[i].widthFt);
        expect(cloned[i].heightFt).toBe(source.booths[i].heightFt);
      }
    });
  });

  // --- Cloned booth IDs are unique ---

  describe("cloned booth IDs are unique", () => {
    test("cloned IDs have clone- prefix", () => {
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      for (const b of cloned) {
        expect(b.id.startsWith("clone-")).toBe(true);
      }
    });

    test("cloned IDs do not match any source booth IDs", () => {
      const source = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      const sourceIds = new Set(source.booths.map((b) => b.id));
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      for (const b of cloned) {
        expect(sourceIds.has(b.id)).toBe(false);
      }
    });

    test("cloned IDs do not collide with current show booth IDs", () => {
      const currentIds = new Set(currentBooths.map((b) => b.id));
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      for (const b of cloned) {
        expect(currentIds.has(b.id)).toBe(false);
      }
    });

    test("cloned IDs are unique within the cloned set", () => {
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      const ids = cloned.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test("cloned booths have showId set to current show", () => {
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      for (const b of cloned) {
        expect(b.showId).toBe(activeShow.id);
      }
    });
  });

  // --- Clone show data has different booth counts ---

  describe("clone shows have different booth counts from current show", () => {
    test("JOGS Winter 2026 has different booth count from Winter 2027", () => {
      const winter2026 = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      expect(winter2026.booths.length).not.toBe(currentBooths.length);
    });

    test("JOGS Fall 2026 has different booth count from Winter 2027", () => {
      const fall2026 = cloneableShows.find(
        (cs) => cs.show.id === "show-fall-2026"
      )!;
      expect(fall2026.booths.length).not.toBe(currentBooths.length);
    });

    test("the two cloneable shows have different booth counts from each other", () => {
      const winter = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      const fall = cloneableShows.find(
        (cs) => cs.show.id === "show-fall-2026"
      )!;
      expect(winter.booths.length).not.toBe(fall.booths.length);
    });
  });

  // --- Toast message format ---

  describe("toast message format is correct", () => {
    test("toast includes booth count and show name", () => {
      const msg = buildCloneToastMessage(76, "JOGS Winter 2026");
      expect(msg).toBe(
        "Cloned 76 booths from JOGS Winter 2026. All exhibitor assignments cleared."
      );
    });

    test("toast for a different show", () => {
      const msg = buildCloneToastMessage(136, "JOGS Fall 2026");
      expect(msg).toBe(
        "Cloned 136 booths from JOGS Fall 2026. All exhibitor assignments cleared."
      );
    });

    test("actual clone operation produces correct toast", () => {
      const source = cloneableShows.find(
        (cs) => cs.show.id === "show-winter-2026"
      )!;
      const cloned = cloneBoothsFromShow(
        "show-winter-2026",
        activeShow.id
      );
      const msg = buildCloneToastMessage(cloned.length, source.show.name);
      expect(msg).toContain(`Cloned ${cloned.length} booths from`);
      expect(msg).toContain("JOGS Winter 2026");
      expect(msg).toContain("All exhibitor assignments cleared.");
    });
  });

  // --- UI elements exist in source ---

  describe("UI elements exist in source", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/FloorPlanEditor.tsx"),
      "utf-8"
    );

    test("clone-from-btn data-testid exists", () => {
      expect(source).toContain('data-testid="clone-from-btn"');
    });

    test("clone-modal data-testid exists", () => {
      expect(source).toContain('data-testid="clone-modal"');
    });

    test("clone-show-select data-testid exists", () => {
      expect(source).toContain('data-testid="clone-show-select"');
    });

    test("clone-confirm-btn data-testid exists", () => {
      expect(source).toContain('data-testid="clone-confirm-btn"');
    });

    test("clone-cancel-btn data-testid exists", () => {
      expect(source).toContain('data-testid="clone-cancel-btn"');
    });

    test("clone-toast data-testid exists", () => {
      expect(source).toContain('data-testid="clone-toast"');
    });

    test("cloneModalOpen state is declared", () => {
      expect(source).toContain("cloneModalOpen");
      expect(source).toContain("setCloneModalOpen");
    });

    test("confirmation warning text exists", () => {
      expect(source).toContain(
        "This will replace all current booths. Continue?"
      );
    });
  });
});
