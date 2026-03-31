/**
 * Ticket 14: Undo / Redo -- Functional Tests
 *
 * Tests validate undo/redo logic: history stack management, state snapshots,
 * max stack depth, and redo clearing on new mutations.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import type { Booth } from "@/types";

// --- Extracted undo/redo logic (mirrors FloorPlanEditor implementation) ---

const MAX_UNDO = 20;

interface UndoRedoState {
  booths: Booth[];
  undoStack: Booth[][];
  redoStack: Booth[];
}

/** Simulate setBoothsWithHistory: push current to undo, clear redo, apply new */
function applyWithHistory(
  current: Booth[],
  undoStack: Booth[][],
  newBooths: Booth[]
): { booths: Booth[]; undoStack: Booth[][]; redoStack: Booth[][] } {
  const newUndo = [...undoStack.slice(-(MAX_UNDO - 1)), current];
  return {
    booths: newBooths,
    undoStack: newUndo,
    redoStack: [],
  };
}

/** Simulate undo: pop from undoStack, push current to redo */
function undoAction(
  current: Booth[],
  undoStack: Booth[][],
  redoStack: Booth[][]
): { booths: Booth[]; undoStack: Booth[][]; redoStack: Booth[][] } | null {
  if (undoStack.length === 0) return null;
  const prev = undoStack[undoStack.length - 1];
  return {
    booths: prev,
    undoStack: undoStack.slice(0, -1),
    redoStack: [...redoStack, current],
  };
}

/** Simulate redo: pop from redoStack, push current to undo */
function redoAction(
  current: Booth[],
  undoStack: Booth[][],
  redoStack: Booth[][]
): { booths: Booth[]; undoStack: Booth[][]; redoStack: Booth[][] } | null {
  if (redoStack.length === 0) return null;
  const next = redoStack[redoStack.length - 1];
  return {
    booths: next,
    undoStack: [...undoStack, current],
    redoStack: redoStack.slice(0, -1),
  };
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

const boothA = makeBooth({ id: "b-a", number: "E100", xFt: 10 });
const boothB = makeBooth({ id: "b-b", number: "E101", xFt: 20 });
const boothC = makeBooth({ id: "b-c", number: "E102", xFt: 30 });

// ============================================================
// Tests
// ============================================================

describe("Ticket 14: Undo / Redo", () => {
  // --- Basic undo ---

  describe("basic undo", () => {
    test("undo restores previous state after a single mutation", () => {
      const initial = [boothA, boothB];
      // Move booth A to xFt=50
      const movedA = { ...boothA, xFt: 50 };
      const afterMove = applyWithHistory(initial, [], [movedA, boothB]);

      expect(afterMove.booths[0].xFt).toBe(50);
      expect(afterMove.undoStack.length).toBe(1);
      expect(afterMove.redoStack.length).toBe(0);

      const afterUndo = undoAction(afterMove.booths, afterMove.undoStack, afterMove.redoStack);
      expect(afterUndo).not.toBeNull();
      expect(afterUndo!.booths[0].xFt).toBe(10); // back to original
      expect(afterUndo!.undoStack.length).toBe(0);
      expect(afterUndo!.redoStack.length).toBe(1);
    });

    test("undo does nothing when undo stack is empty", () => {
      const result = undoAction([boothA], [], []);
      expect(result).toBeNull();
    });

    test("multiple undos restore multiple states in reverse order", () => {
      let booths = [boothA];
      let undoStack: Booth[][] = [];
      let redoStack: Booth[][] = [];

      // Add booth B
      const state1 = applyWithHistory(booths, undoStack, [boothA, boothB]);
      booths = state1.booths;
      undoStack = state1.undoStack;
      redoStack = state1.redoStack;

      // Add booth C
      const state2 = applyWithHistory(booths, undoStack, [boothA, boothB, boothC]);
      booths = state2.booths;
      undoStack = state2.undoStack;
      redoStack = state2.redoStack;

      expect(booths.length).toBe(3);
      expect(undoStack.length).toBe(2);

      // Undo add C
      const undo1 = undoAction(booths, undoStack, redoStack)!;
      expect(undo1.booths.length).toBe(2);

      // Undo add B
      const undo2 = undoAction(undo1.booths, undo1.undoStack, undo1.redoStack)!;
      expect(undo2.booths.length).toBe(1);
      expect(undo2.booths[0].id).toBe("b-a");
    });
  });

  // --- Basic redo ---

  describe("basic redo", () => {
    test("redo restores state after undo", () => {
      const initial = [boothA];
      const afterAdd = applyWithHistory(initial, [], [boothA, boothB]);
      const afterUndo = undoAction(afterAdd.booths, afterAdd.undoStack, afterAdd.redoStack)!;

      expect(afterUndo.booths.length).toBe(1);

      const afterRedo = redoAction(afterUndo.booths, afterUndo.undoStack, afterUndo.redoStack)!;
      expect(afterRedo.booths.length).toBe(2);
      expect(afterRedo.booths[1].id).toBe("b-b");
    });

    test("redo does nothing when redo stack is empty", () => {
      const result = redoAction([boothA], [], []);
      expect(result).toBeNull();
    });

    test("redo after multiple undos restores incrementally", () => {
      let booths = [boothA];
      let undoStack: Booth[][] = [];
      let redoStack: Booth[][] = [];

      // Add B then C
      const s1 = applyWithHistory(booths, undoStack, [boothA, boothB]);
      const s2 = applyWithHistory(s1.booths, s1.undoStack, [boothA, boothB, boothC]);

      // Undo twice
      const u1 = undoAction(s2.booths, s2.undoStack, s2.redoStack)!;
      const u2 = undoAction(u1.booths, u1.undoStack, u1.redoStack)!;
      expect(u2.booths.length).toBe(1);
      expect(u2.redoStack.length).toBe(2);

      // Redo once => 2 booths
      const r1 = redoAction(u2.booths, u2.undoStack, u2.redoStack)!;
      expect(r1.booths.length).toBe(2);

      // Redo again => 3 booths
      const r2 = redoAction(r1.booths, r1.undoStack, r1.redoStack)!;
      expect(r2.booths.length).toBe(3);
    });
  });

  // --- Redo clearing ---

  describe("redo clearing on new mutation", () => {
    test("new mutation after undo clears redo stack", () => {
      const initial = [boothA];
      const s1 = applyWithHistory(initial, [], [boothA, boothB]);
      const u1 = undoAction(s1.booths, s1.undoStack, s1.redoStack)!;

      expect(u1.redoStack.length).toBe(1);

      // New mutation: add C instead of redoing B
      const s2 = applyWithHistory(u1.booths, u1.undoStack, [boothA, boothC]);
      expect(s2.redoStack.length).toBe(0); // redo cleared
      expect(s2.booths.length).toBe(2);
      expect(s2.booths[1].id).toBe("b-c");
    });
  });

  // --- Max stack depth ---

  describe("max stack depth", () => {
    test("undo stack is capped at MAX_UNDO (20)", () => {
      let booths = [boothA];
      let undoStack: Booth[][] = [];

      // Apply 25 mutations
      for (let i = 0; i < 25; i++) {
        const movedA = { ...boothA, xFt: i * 10 };
        const result = applyWithHistory(booths, undoStack, [movedA]);
        booths = result.booths;
        undoStack = result.undoStack;
      }

      expect(undoStack.length).toBe(MAX_UNDO);
    });

    test("oldest state is dropped when stack exceeds MAX_UNDO", () => {
      let booths = [boothA];
      let undoStack: Booth[][] = [];

      // Apply 22 mutations (with xFt = i * 10)
      for (let i = 1; i <= 22; i++) {
        const movedA = { ...boothA, xFt: i * 10 };
        const result = applyWithHistory(booths, undoStack, [movedA]);
        booths = result.booths;
        undoStack = result.undoStack;
      }

      expect(undoStack.length).toBe(MAX_UNDO);
      // Oldest remaining state should be from mutation 3 (since mutations 1,2 were dropped)
      // The undoStack[0] is the state BEFORE mutation 3 was applied, which is the result of mutation 2
      expect(undoStack[0][0].xFt).toBe(20); // state after mutation 2
    });
  });

  // --- Move + undo + redo cycle ---

  describe("move booth, undo, redo cycle", () => {
    test("move a booth, undo returns it, redo moves it again", () => {
      const initial = [boothA, boothB];
      const movedA = { ...boothA, xFt: 100 };
      const afterMove = applyWithHistory(initial, [], [movedA, boothB]);

      expect(afterMove.booths[0].xFt).toBe(100);

      const afterUndo = undoAction(afterMove.booths, afterMove.undoStack, afterMove.redoStack)!;
      expect(afterUndo.booths[0].xFt).toBe(10);

      const afterRedo = redoAction(afterUndo.booths, afterUndo.undoStack, afterUndo.redoStack)!;
      expect(afterRedo.booths[0].xFt).toBe(100);
    });
  });

  // --- Add 3 booths, undo 3, redo 2 ---

  describe("add 3 booths, undo 3, redo 2 (acceptance criteria)", () => {
    test("add 3, undo 3 => all gone, redo 2 => 2 come back", () => {
      let booths: Booth[] = [];
      let undoStack: Booth[][] = [];
      let redoStack: Booth[][] = [];

      // Add booth A
      const s1 = applyWithHistory(booths, undoStack, [boothA]);
      booths = s1.booths; undoStack = s1.undoStack; redoStack = s1.redoStack;
      expect(booths.length).toBe(1);

      // Add booth B
      const s2 = applyWithHistory(booths, undoStack, [boothA, boothB]);
      booths = s2.booths; undoStack = s2.undoStack; redoStack = s2.redoStack;
      expect(booths.length).toBe(2);

      // Add booth C
      const s3 = applyWithHistory(booths, undoStack, [boothA, boothB, boothC]);
      booths = s3.booths; undoStack = s3.undoStack; redoStack = s3.redoStack;
      expect(booths.length).toBe(3);

      // Undo 3 times => all disappear
      const u1 = undoAction(booths, undoStack, redoStack)!;
      const u2 = undoAction(u1.booths, u1.undoStack, u1.redoStack)!;
      const u3 = undoAction(u2.booths, u2.undoStack, u2.redoStack)!;

      expect(u3.booths.length).toBe(0);
      expect(u3.redoStack.length).toBe(3);

      // Redo twice => 2 come back
      const r1 = redoAction(u3.booths, u3.undoStack, u3.redoStack)!;
      const r2 = redoAction(r1.booths, r1.undoStack, r1.redoStack)!;

      expect(r2.booths.length).toBe(2);
      expect(r2.booths[0].id).toBe("b-a");
      expect(r2.booths[1].id).toBe("b-b");
    });
  });

  // --- Delete + undo ---

  describe("delete and undo", () => {
    test("deleting a booth then undoing brings it back", () => {
      const initial = [boothA, boothB, boothC];
      // Delete boothB
      const afterDelete = applyWithHistory(initial, [], [boothA, boothC]);

      expect(afterDelete.booths.length).toBe(2);
      expect(afterDelete.booths.find((b) => b.id === "b-b")).toBeUndefined();

      const afterUndo = undoAction(afterDelete.booths, afterDelete.undoStack, afterDelete.redoStack)!;
      expect(afterUndo.booths.length).toBe(3);
      expect(afterUndo.booths.find((b) => b.id === "b-b")).toBeDefined();
    });
  });

  // --- Property change + undo ---

  describe("property change and undo", () => {
    test("changing booth status then undoing restores original status", () => {
      const initial = [boothA];
      const changed = [{ ...boothA, status: "sold" as const }];
      const afterChange = applyWithHistory(initial, [], changed);

      expect(afterChange.booths[0].status).toBe("sold");

      const afterUndo = undoAction(afterChange.booths, afterChange.undoStack, afterChange.redoStack)!;
      expect(afterUndo.booths[0].status).toBe("available");
    });
  });

  // --- Works with real mock data ---

  describe("works with real mock data", () => {
    test("can snapshot and restore real mock data booths", () => {
      const original = [...mockData.booths];
      const modified = original.map((b, i) =>
        i === 0 ? { ...b, xFt: 999 } : b
      );
      const result = applyWithHistory(original, [], modified);

      expect(result.booths[0].xFt).toBe(999);

      const afterUndo = undoAction(result.booths, result.undoStack, result.redoStack)!;
      expect(afterUndo.booths[0].xFt).toBe(original[0].xFt);
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

    test("undo-btn data-testid exists", () => {
      expect(source).toContain('data-testid="undo-btn"');
    });

    test("redo-btn data-testid exists", () => {
      expect(source).toContain('data-testid="redo-btn"');
    });

    test("Ctrl+Z undo keyboard handler exists in source", () => {
      expect(source).toContain("undo");
      expect(source).toContain("redo");
      expect(source).toContain("ctrlKey");
    });

    test("setBoothsWithHistory wrapper is used for mutations", () => {
      // All booth mutation calls should go through setBoothsWithHistory, not raw setBooths
      const rawSetBoothsCalls = source.match(/[^t]setBooths\(/g) || [];
      // Only 3 allowed: inside setBoothsWithHistory wrapper, inside undo(), inside redo()
      expect(rawSetBoothsCalls.length).toBeLessThanOrEqual(3);
    });

    test("undoStack and redoStack refs exist", () => {
      expect(source).toContain("undoStackRef");
      expect(source).toContain("redoStackRef");
    });

    test("MAX_UNDO constant is defined", () => {
      expect(source).toContain("MAX_UNDO");
    });

    test("undo and redo buttons have disabled state", () => {
      expect(source).toContain("canUndo");
      expect(source).toContain("canRedo");
    });
  });
});
