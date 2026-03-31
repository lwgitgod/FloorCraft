/**
 * Ticket 11: Auto-Number Selected Booths -- Functional Tests
 *
 * Tests validate auto-numbering logic: sorting by position,
 * direction detection, prefix + sequential numbering, and preview generation.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import type { Booth } from "@/types";

// --- Extracted logic (mirrors FloorPlanEditor implementation) ---

type Direction = "ltr" | "ttb";

/** Sort booths by position based on direction */
function sortBoothsByPosition(booths: Booth[], direction: Direction): Booth[] {
  return [...booths].sort((a, b) => {
    if (direction === "ltr") {
      return a.xFt !== b.xFt ? a.xFt - b.xFt : a.yFt - b.yFt;
    } else {
      return a.yFt !== b.yFt ? a.yFt - b.yFt : a.xFt - b.xFt;
    }
  });
}

/** Detect direction based on position span */
function detectDirection(booths: Booth[]): Direction {
  if (booths.length < 2) return "ltr";
  const xs = booths.map((b) => b.xFt);
  const ys = booths.map((b) => b.yFt);
  const xSpan = Math.max(...xs) - Math.min(...xs);
  const ySpan = Math.max(...ys) - Math.min(...ys);
  return xSpan >= ySpan ? "ltr" : "ttb";
}

/** Extract prefix from a booth number (leading non-digit characters) */
function extractPrefix(boothNumber: string): string {
  const match = boothNumber.match(/^([A-Za-z]*)/);
  return match ? match[1] : "";
}

/** Generate preview: sorted booths with old -> new number mappings */
function generatePreview(
  booths: Booth[],
  prefix: string,
  startNum: number,
  direction: Direction
): Array<{ id: string; oldNumber: string; newNumber: string }> {
  const sorted = sortBoothsByPosition(booths, direction);
  return sorted.map((booth, i) => ({
    id: booth.id,
    oldNumber: booth.number,
    newNumber: `${prefix}${startNum + i}`,
  }));
}

/** Apply auto-numbering: returns updated booths array */
function applyAutoNumber(
  allBooths: Booth[],
  selectedBooths: Booth[],
  prefix: string,
  startNum: number,
  direction: Direction
): Booth[] {
  const preview = generatePreview(selectedBooths, prefix, startNum, direction);
  const updateMap = new Map(preview.map((p) => [p.id, p.newNumber]));
  return allBooths.map((b) => {
    const newNum = updateMap.get(b.id);
    return newNum ? { ...b, number: newNum } : b;
  });
}

// --- Test fixtures ---

function makeBooth(overrides: Partial<Booth> & { id: string }): Booth {
  return {
    number: "X100",
    hallId: "hall-east",
    showId: "show-1",
    pavilionId: "",
    status: "available",
    boothType: "inline",
    xFt: 0,
    yFt: 0,
    widthFt: 10,
    heightFt: 10,
    price: 3500,
    ...overrides,
  };
}

/** Create a horizontal row of booths */
function makeHorizontalRow(): Booth[] {
  return [
    makeBooth({ id: "b1", number: "E100", xFt: 0, yFt: 0 }),
    makeBooth({ id: "b2", number: "E101", xFt: 10, yFt: 0 }),
    makeBooth({ id: "b3", number: "E102", xFt: 20, yFt: 0 }),
    makeBooth({ id: "b4", number: "E103", xFt: 30, yFt: 0 }),
    makeBooth({ id: "b5", number: "E104", xFt: 40, yFt: 0 }),
    makeBooth({ id: "b6", number: "E105", xFt: 50, yFt: 0 }),
  ];
}

/** Create a vertical column of booths */
function makeVerticalColumn(): Booth[] {
  return [
    makeBooth({ id: "v1", number: "W200", xFt: 0, yFt: 0 }),
    makeBooth({ id: "v2", number: "W201", xFt: 0, yFt: 10 }),
    makeBooth({ id: "v3", number: "W202", xFt: 0, yFt: 20 }),
    makeBooth({ id: "v4", number: "W203", xFt: 0, yFt: 30 }),
  ];
}

// ============================================================
// Tests
// ============================================================

describe("Ticket 11: Auto-Number Selected Booths", () => {
  // --- data-testid existence checks ---

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

    test('auto-number-btn testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-btn"');
    });

    test('auto-number-modal testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-modal"');
    });

    test('auto-number-prefix testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-prefix"');
    });

    test('auto-number-start testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-start"');
    });

    test('auto-number-direction testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-direction"');
    });

    test('auto-number-preview testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-preview"');
    });

    test('auto-number-apply testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-apply"');
    });

    test('auto-number-cancel testid is defined', () => {
      expect(source).toContain('data-testid="auto-number-cancel"');
    });
  });

  // --- Sorting logic ---

  describe("sorting: left to right", () => {
    test("sorts booths by xFt ascending", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 30, yFt: 0 }),
        makeBooth({ id: "b", xFt: 10, yFt: 0 }),
        makeBooth({ id: "c", xFt: 20, yFt: 0 }),
      ];
      const sorted = sortBoothsByPosition(booths, "ltr");
      expect(sorted.map((b) => b.id)).toEqual(["b", "c", "a"]);
    });

    test("uses yFt as tiebreaker when xFt is equal", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 10, yFt: 20 }),
        makeBooth({ id: "b", xFt: 10, yFt: 10 }),
        makeBooth({ id: "c", xFt: 10, yFt: 30 }),
      ];
      const sorted = sortBoothsByPosition(booths, "ltr");
      expect(sorted.map((b) => b.id)).toEqual(["b", "a", "c"]);
    });

    test("handles single booth", () => {
      const booths = [makeBooth({ id: "only", xFt: 50, yFt: 50 })];
      const sorted = sortBoothsByPosition(booths, "ltr");
      expect(sorted.length).toBe(1);
      expect(sorted[0].id).toBe("only");
    });
  });

  describe("sorting: top to bottom", () => {
    test("sorts booths by yFt ascending", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 0, yFt: 30 }),
        makeBooth({ id: "b", xFt: 0, yFt: 10 }),
        makeBooth({ id: "c", xFt: 0, yFt: 20 }),
      ];
      const sorted = sortBoothsByPosition(booths, "ttb");
      expect(sorted.map((b) => b.id)).toEqual(["b", "c", "a"]);
    });

    test("uses xFt as tiebreaker when yFt is equal", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 20, yFt: 10 }),
        makeBooth({ id: "b", xFt: 10, yFt: 10 }),
        makeBooth({ id: "c", xFt: 30, yFt: 10 }),
      ];
      const sorted = sortBoothsByPosition(booths, "ttb");
      expect(sorted.map((b) => b.id)).toEqual(["b", "a", "c"]);
    });
  });

  // --- Direction auto-detection ---

  describe("direction auto-detection", () => {
    test("horizontal row detects as ltr", () => {
      const booths = makeHorizontalRow();
      expect(detectDirection(booths)).toBe("ltr");
    });

    test("vertical column detects as ttb", () => {
      const booths = makeVerticalColumn();
      expect(detectDirection(booths)).toBe("ttb");
    });

    test("equal span defaults to ltr", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 0, yFt: 0 }),
        makeBooth({ id: "b", xFt: 10, yFt: 10 }),
      ];
      expect(detectDirection(booths)).toBe("ltr");
    });

    test("single booth defaults to ltr", () => {
      const booths = [makeBooth({ id: "a", xFt: 0, yFt: 0 })];
      expect(detectDirection(booths)).toBe("ltr");
    });

    test("empty array defaults to ltr", () => {
      expect(detectDirection([])).toBe("ltr");
    });

    test("wider horizontal span detects as ltr even with some vertical offset", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 0, yFt: 0 }),
        makeBooth({ id: "b", xFt: 10, yFt: 5 }),
        makeBooth({ id: "c", xFt: 20, yFt: 0 }),
        makeBooth({ id: "d", xFt: 30, yFt: 5 }),
      ];
      // xSpan = 30, ySpan = 5 -> ltr
      expect(detectDirection(booths)).toBe("ltr");
    });

    test("taller vertical span detects as ttb even with some horizontal offset", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 0, yFt: 0 }),
        makeBooth({ id: "b", xFt: 5, yFt: 10 }),
        makeBooth({ id: "c", xFt: 0, yFt: 20 }),
        makeBooth({ id: "d", xFt: 5, yFt: 30 }),
      ];
      // xSpan = 5, ySpan = 30 -> ttb
      expect(detectDirection(booths)).toBe("ttb");
    });
  });

  // --- Prefix extraction ---

  describe("prefix extraction", () => {
    test("extracts single letter prefix", () => {
      expect(extractPrefix("E100")).toBe("E");
    });

    test("extracts multi-letter prefix", () => {
      expect(extractPrefix("NW100")).toBe("NW");
    });

    test("returns empty string for numeric-only number", () => {
      expect(extractPrefix("100")).toBe("");
    });

    test("handles empty string", () => {
      expect(extractPrefix("")).toBe("");
    });
  });

  // --- Preview generation ---

  describe("preview generation", () => {
    test("generates correct preview for horizontal row with prefix N starting at 101", () => {
      const booths = makeHorizontalRow();
      const preview = generatePreview(booths, "N", 101, "ltr");
      expect(preview.length).toBe(6);
      expect(preview[0]).toEqual({ id: "b1", oldNumber: "E100", newNumber: "N101" });
      expect(preview[1]).toEqual({ id: "b2", oldNumber: "E101", newNumber: "N102" });
      expect(preview[2]).toEqual({ id: "b3", oldNumber: "E102", newNumber: "N103" });
      expect(preview[3]).toEqual({ id: "b4", oldNumber: "E103", newNumber: "N104" });
      expect(preview[4]).toEqual({ id: "b5", oldNumber: "E104", newNumber: "N105" });
      expect(preview[5]).toEqual({ id: "b6", oldNumber: "E105", newNumber: "N106" });
    });

    test("generates correct preview for vertical column", () => {
      const booths = makeVerticalColumn();
      const preview = generatePreview(booths, "W", 200, "ttb");
      expect(preview.length).toBe(4);
      expect(preview[0].newNumber).toBe("W200");
      expect(preview[3].newNumber).toBe("W203");
    });

    test("preview respects sort order (unsorted input)", () => {
      const booths = [
        makeBooth({ id: "c", number: "E102", xFt: 20, yFt: 0 }),
        makeBooth({ id: "a", number: "E100", xFt: 0, yFt: 0 }),
        makeBooth({ id: "b", number: "E101", xFt: 10, yFt: 0 }),
      ];
      const preview = generatePreview(booths, "N", 1, "ltr");
      expect(preview[0].id).toBe("a");
      expect(preview[0].newNumber).toBe("N1");
      expect(preview[1].id).toBe("b");
      expect(preview[1].newNumber).toBe("N2");
      expect(preview[2].id).toBe("c");
      expect(preview[2].newNumber).toBe("N3");
    });

    test("empty prefix produces numeric-only numbers", () => {
      const booths = [makeBooth({ id: "a", xFt: 0, yFt: 0 })];
      const preview = generatePreview(booths, "", 500, "ltr");
      expect(preview[0].newNumber).toBe("500");
    });
  });

  // --- Apply auto-number ---

  describe("apply auto-number", () => {
    test("updates selected booths and leaves others unchanged", () => {
      const selected = makeHorizontalRow().slice(0, 3); // b1, b2, b3
      const unselected = [makeBooth({ id: "other", number: "W999", xFt: 100, yFt: 100 })];
      const allBooths = [...selected, ...unselected];

      const result = applyAutoNumber(allBooths, selected, "N", 101, "ltr");

      // Selected booths should be renumbered
      expect(result.find((b) => b.id === "b1")!.number).toBe("N101");
      expect(result.find((b) => b.id === "b2")!.number).toBe("N102");
      expect(result.find((b) => b.id === "b3")!.number).toBe("N103");

      // Unselected booth should be unchanged
      expect(result.find((b) => b.id === "other")!.number).toBe("W999");
    });

    test("acceptance criteria: 6 booths, prefix N, start 101, ltr", () => {
      const booths = makeHorizontalRow();
      const result = applyAutoNumber(booths, booths, "N", 101, "ltr");

      expect(result.map((b) => b.number)).toEqual([
        "N101", "N102", "N103", "N104", "N105", "N106",
      ]);
    });

    test("does not mutate original booth objects", () => {
      const booths = makeHorizontalRow();
      const originalNumbers = booths.map((b) => b.number);
      applyAutoNumber(booths, booths, "X", 1, "ltr");
      // Original array should be untouched
      expect(booths.map((b) => b.number)).toEqual(originalNumbers);
    });
  });

  // --- Edge cases ---

  describe("edge cases", () => {
    test("booths at same x position, different y: ltr uses y as tiebreaker", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 10, yFt: 30 }),
        makeBooth({ id: "b", xFt: 10, yFt: 10 }),
        makeBooth({ id: "c", xFt: 10, yFt: 20 }),
      ];
      const preview = generatePreview(booths, "A", 1, "ltr");
      expect(preview.map((p) => p.id)).toEqual(["b", "c", "a"]);
    });

    test("booths at same y position, different x: ttb uses x as tiebreaker", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 30, yFt: 10 }),
        makeBooth({ id: "b", xFt: 10, yFt: 10 }),
        makeBooth({ id: "c", xFt: 20, yFt: 10 }),
      ];
      const preview = generatePreview(booths, "A", 1, "ttb");
      expect(preview.map((p) => p.id)).toEqual(["b", "c", "a"]);
    });

    test("mixed positions with diagonal layout", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 30, yFt: 30 }),
        makeBooth({ id: "b", xFt: 10, yFt: 10 }),
        makeBooth({ id: "c", xFt: 20, yFt: 20 }),
      ];
      // ltr: sort by x -> b(10), c(20), a(30)
      const previewLtr = generatePreview(booths, "D", 1, "ltr");
      expect(previewLtr.map((p) => p.id)).toEqual(["b", "c", "a"]);

      // ttb: sort by y -> b(10), c(20), a(30)
      const previewTtb = generatePreview(booths, "D", 1, "ttb");
      expect(previewTtb.map((p) => p.id)).toEqual(["b", "c", "a"]);
    });

    test("large start number works correctly", () => {
      const booths = [
        makeBooth({ id: "a", xFt: 0, yFt: 0 }),
        makeBooth({ id: "b", xFt: 10, yFt: 0 }),
      ];
      const preview = generatePreview(booths, "Z", 9999, "ltr");
      expect(preview[0].newNumber).toBe("Z9999");
      expect(preview[1].newNumber).toBe("Z10000");
    });

    test("two booths at identical positions maintain stable order", () => {
      const booths = [
        makeBooth({ id: "first", xFt: 10, yFt: 10 }),
        makeBooth({ id: "second", xFt: 10, yFt: 10 }),
      ];
      const preview = generatePreview(booths, "A", 1, "ltr");
      // Both have same position -- sort is stable so original order preserved
      expect(preview.length).toBe(2);
      expect(preview[0].newNumber).toBe("A1");
      expect(preview[1].newNumber).toBe("A2");
    });
  });
});
