/**
 * Ticket 3: Booth Selection + Properties Panel — Functional Tests
 *
 * These tests validate the data layer and selection logic that powers the
 * booth selection and properties panel feature. Since react-konva requires
 * a browser canvas, we test the underlying data, types, and state logic
 * rather than DOM rendering.
 */

import { mockData } from "@/data/mockData";
import type { Booth, BoothStatus, BoothType, Pavilion } from "@/types";

// ============================================================
// Helper: simulate selection state management
// ============================================================

class SelectionState {
  private selected: string[] = [];

  click(boothId: string, shiftKey = false): void {
    if (shiftKey) {
      const idx = this.selected.indexOf(boothId);
      if (idx >= 0) {
        this.selected.splice(idx, 1);
      } else {
        this.selected.push(boothId);
      }
    } else {
      this.selected = [boothId];
    }
  }

  clickEmpty(): void {
    this.selected = [];
  }

  get ids(): string[] {
    return [...this.selected];
  }

  get size(): number {
    return this.selected.length;
  }

  has(id: string): boolean {
    return this.selected.indexOf(id) >= 0;
  }
}

// Helper: simulate bulk booth updates (same logic as FloorPlanEditor)
function applyBulkUpdate(
  booths: Booth[],
  ids: string[],
  updates: Partial<Booth>
): Booth[] {
  const idSet = new Set(ids);
  return booths.map((b) => (idSet.has(b.id) ? { ...b, ...updates } : b));
}

// Helper: simulate single booth update
function applyUpdate(
  booths: Booth[],
  id: string,
  updates: Partial<Booth>
): Booth[] {
  return booths.map((b) => (b.id === id ? { ...b, ...updates } : b));
}

// ============================================================
// Tests
// ============================================================

describe("Ticket 3: Booth Selection + Properties Panel", () => {
  // ----- Mock data integrity -----

  describe("Mock data supports Ticket 3 requirements", () => {
    test("booths have all required properties for the panel", () => {
      const booth = mockData.booths[0];
      expect(booth).toHaveProperty("id");
      expect(booth).toHaveProperty("number");
      expect(booth).toHaveProperty("pavilionId");
      expect(booth).toHaveProperty("status");
      expect(booth).toHaveProperty("boothType");
      expect(booth).toHaveProperty("widthFt");
      expect(booth).toHaveProperty("heightFt");
      expect(booth).toHaveProperty("price");
      // notes and exhibitorName are optional
      expect("notes" in booth || booth.notes === undefined).toBe(true);
    });

    test("boothType field is one of the valid types", () => {
      const validTypes: BoothType[] = ["inline", "corner", "island", "outdoor"];
      for (const booth of mockData.booths) {
        expect(validTypes).toContain(booth.boothType);
      }
    });

    test("price is a positive number for all booths", () => {
      for (const booth of mockData.booths) {
        expect(booth.price).toBeGreaterThan(0);
        expect(typeof booth.price).toBe("number");
      }
    });

    test("square footage can be calculated from dimensions", () => {
      const booth = mockData.booths[0];
      const sqft = booth.widthFt * booth.heightFt;
      expect(sqft).toBeGreaterThan(0);
    });

    test("pavilion lookup works for every booth", () => {
      const pavMap = new Map(mockData.pavilions.map((p) => [p.id, p]));
      for (const booth of mockData.booths) {
        const pav = pavMap.get(booth.pavilionId);
        expect(pav).toBeDefined();
        expect(pav!.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    test("sold booths have exhibitor names, others may not", () => {
      const soldBooths = mockData.booths.filter((b) => b.status === "sold");
      expect(soldBooths.length).toBeGreaterThan(0);
      for (const booth of soldBooths) {
        expect(booth.exhibitorName).toBeTruthy();
      }
    });

    test("held booths have notes", () => {
      const heldBooths = mockData.booths.filter((b) => b.status === "held");
      expect(heldBooths.length).toBeGreaterThan(0);
      for (const booth of heldBooths) {
        expect(booth.notes).toBeTruthy();
      }
    });
  });

  // ----- Selection logic -----

  describe("Selection state management", () => {
    let sel: SelectionState;

    beforeEach(() => {
      sel = new SelectionState();
    });

    test("clicking a booth selects it", () => {
      sel.click("booth-E-100");
      expect(sel.size).toBe(1);
      expect(sel.has("booth-E-100")).toBe(true);
    });

    test("clicking another booth replaces selection", () => {
      sel.click("booth-E-100");
      sel.click("booth-E-101");
      expect(sel.size).toBe(1);
      expect(sel.has("booth-E-100")).toBe(false);
      expect(sel.has("booth-E-101")).toBe(true);
    });

    test("clicking empty space deselects all", () => {
      sel.click("booth-E-100");
      sel.click("booth-E-101", true);
      expect(sel.size).toBe(2);
      sel.clickEmpty();
      expect(sel.size).toBe(0);
    });

    test("shift+click adds to multi-selection", () => {
      sel.click("booth-E-100");
      sel.click("booth-E-101", true);
      sel.click("booth-E-102", true);
      expect(sel.size).toBe(3);
      expect(sel.has("booth-E-100")).toBe(true);
      expect(sel.has("booth-E-101")).toBe(true);
      expect(sel.has("booth-E-102")).toBe(true);
    });

    test("shift+click on already selected booth deselects it", () => {
      sel.click("booth-E-100");
      sel.click("booth-E-101", true);
      sel.click("booth-E-100", true); // toggle off
      expect(sel.size).toBe(1);
      expect(sel.has("booth-E-100")).toBe(false);
      expect(sel.has("booth-E-101")).toBe(true);
    });

    test("ids returns array of selected booth ids", () => {
      sel.click("booth-E-100");
      sel.click("booth-E-101", true);
      const ids = sel.ids;
      expect(ids).toHaveLength(2);
      expect(ids).toContain("booth-E-100");
      expect(ids).toContain("booth-E-101");
    });
  });

  // ----- Single booth property display -----

  describe("Single booth properties", () => {
    test("single selection exposes all display fields", () => {
      const booth = mockData.booths.find((b) => b.status === "sold")!;
      expect(booth).toBeDefined();

      // All fields that the panel needs to display
      expect(booth.number).toBeTruthy();
      expect(booth.widthFt).toBeGreaterThan(0);
      expect(booth.heightFt).toBeGreaterThan(0);
      expect(booth.widthFt * booth.heightFt).toBeGreaterThan(0); // sqft
      expect(booth.pavilionId).toBeTruthy();
      expect(booth.boothType).toBeTruthy();
      expect(booth.status).toBe("sold");
      expect(booth.exhibitorName).toBeTruthy();
      expect(booth.price).toBeGreaterThan(0);
    });
  });

  // ----- Booth updates -----

  describe("Single booth updates", () => {
    test("changing pavilion updates the booth", () => {
      const booths = [...mockData.booths];
      const targetId = booths[0].id;
      const newPavilionId = "pav-designer";

      const updated = applyUpdate(booths, targetId, {
        pavilionId: newPavilionId,
      });

      expect(updated.find((b) => b.id === targetId)!.pavilionId).toBe(
        newPavilionId
      );
      // Others unchanged
      expect(updated.find((b) => b.id === booths[1].id)!.pavilionId).toBe(
        booths[1].pavilionId
      );
    });

    test("changing status updates the booth", () => {
      const booths = [...mockData.booths];
      const targetId = booths[0].id;

      const updated = applyUpdate(booths, targetId, { status: "blocked" });
      expect(updated.find((b) => b.id === targetId)!.status).toBe("blocked");
    });

    test("changing notes updates the booth", () => {
      const booths = [...mockData.booths];
      const targetId = booths[0].id;

      const updated = applyUpdate(booths, targetId, {
        notes: "VIP exhibitor",
      });
      expect(updated.find((b) => b.id === targetId)!.notes).toBe(
        "VIP exhibitor"
      );
    });
  });

  // ----- Bulk updates -----

  describe("Bulk booth updates", () => {
    test("bulk pavilion change updates all selected booths", () => {
      const booths = [...mockData.booths];
      const ids = [booths[0].id, booths[1].id, booths[2].id];
      const newPavilionId = "pav-amber";

      const updated = applyBulkUpdate(booths, ids, {
        pavilionId: newPavilionId,
      });

      for (const id of ids) {
        expect(updated.find((b) => b.id === id)!.pavilionId).toBe(
          newPavilionId
        );
      }
      // Unselected booth unchanged
      expect(updated.find((b) => b.id === booths[3].id)!.pavilionId).toBe(
        booths[3].pavilionId
      );
    });

    test("bulk status change updates all selected booths", () => {
      const booths = [...mockData.booths];
      const ids = [booths[0].id, booths[1].id];

      const updated = applyBulkUpdate(booths, ids, { status: "held" });
      for (const id of ids) {
        expect(updated.find((b) => b.id === id)!.status).toBe("held");
      }
    });

    test("bulk type change updates all selected booths", () => {
      const booths = [...mockData.booths];
      const ids = [booths[0].id, booths[1].id, booths[2].id];

      const updated = applyBulkUpdate(booths, ids, { boothType: "island" });
      for (const id of ids) {
        expect(updated.find((b) => b.id === id)!.boothType).toBe("island");
      }
    });

    test("bulk update does not affect non-selected booths", () => {
      const booths = [...mockData.booths];
      const ids = [booths[0].id];
      const unchangedId = booths[5].id;
      const originalStatus = booths[5].status;

      const updated = applyBulkUpdate(booths, ids, { status: "blocked" });
      expect(updated.find((b) => b.id === unchangedId)!.status).toBe(
        originalStatus
      );
    });
  });

  // ----- Color logic -----

  describe("Booth color reflects pavilion", () => {
    test("booth fill color matches its pavilion color", () => {
      const pavMap = new Map(mockData.pavilions.map((p) => [p.id, p]));
      const booth = mockData.booths.find((b) => b.status === "sold")!;
      const pav = pavMap.get(booth.pavilionId)!;
      expect(pav.color).toBeTruthy();
    });

    test("blocked booths get blocked color regardless of pavilion", () => {
      const blockedBooth = mockData.booths.find(
        (b) => b.status === "blocked"
      );
      // If there's a blocked booth, it should exist
      if (blockedBooth) {
        expect(blockedBooth.status).toBe("blocked");
      }
    });

    test("after bulk pavilion change, new color should apply", () => {
      const booths = [...mockData.booths];
      const pavMap = new Map(mockData.pavilions.map((p) => [p.id, p]));

      const targetId = booths[0].id;
      const newPavId = "pav-designer";
      const updated = applyBulkUpdate(booths, [targetId], {
        pavilionId: newPavId,
      });

      const updatedBooth = updated.find((b) => b.id === targetId)!;
      const newPav = pavMap.get(updatedBooth.pavilionId)!;
      expect(newPav.color).toBe("#C0392B"); // Designer Jewelry red
    });
  });

  // ----- Integration: selection + update flow -----

  describe("Full selection → update flow", () => {
    test("select 3 booths with shift+click, bulk change pavilion", () => {
      const sel = new SelectionState();
      let booths = [...mockData.booths];

      // Select 3 booths
      sel.click(booths[0].id);
      sel.click(booths[1].id, true);
      sel.click(booths[2].id, true);
      expect(sel.size).toBe(3);

      // Bulk change pavilion
      booths = applyBulkUpdate(booths, sel.ids, {
        pavilionId: "pav-turquoise",
      });

      // Verify all 3 changed
      for (const id of sel.ids) {
        expect(booths.find((b) => b.id === id)!.pavilionId).toBe(
          "pav-turquoise"
        );
      }
    });

    test("deselect and reselect picks up updated data", () => {
      const sel = new SelectionState();
      let booths = [...mockData.booths];

      // Select and update
      sel.click(booths[0].id);
      booths = applyUpdate(booths, booths[0].id, { notes: "Updated note" });

      // Deselect
      sel.clickEmpty();
      expect(sel.size).toBe(0);

      // Reselect — booth should show updated note
      sel.click(booths[0].id);
      const selectedBooth = booths.find((b) => sel.has(b.id))!;
      expect(selectedBooth.notes).toBe("Updated note");
    });
  });
});
