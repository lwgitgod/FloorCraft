/**
 * Ticket 18: Visual Polish & Demo Readiness -- Functional Tests
 *
 * Tests validate the new gem-inspired color palette, warm light theme,
 * booth styling logic, auto-contrast text, and theme constants.
 * These are pure logic tests -- no canvas/DOM rendering required.
 */

import { mockData } from "@/data/mockData";
import {
  STATUS_COLORS,
  getBoothFill,
  getBoothOpacity,
  getBoothBorder,
  darkenColor,
  getAutoContrastText,
  getLuminance,
  CANVAS_BG,
  HALL_STROKE,
  HALL_FILL_INDOOR,
  HALL_FILL_OUTDOOR,
  AISLE_COLOR,
  GRID_COLOR,
  GRID_MAJOR_COLOR,
  TOOLBAR_BG,
  TOOLBAR_BORDER,
  BOOTH_CORNER_RADIUS,
  SELECTION_ACCENT,
  BLOCKED_COLOR,
} from "@/utils/boothColors";
import type { Booth, Pavilion } from "@/types";

// --- Helpers ---

function buildPavilionMap(pavilions: Pavilion[]): Map<string, Pavilion> {
  const map = new Map<string, Pavilion>();
  for (const p of pavilions) map.set(p.id, p);
  return map;
}

const pavilionMap = buildPavilionMap(mockData.pavilions);

function makeBooth(overrides: Partial<Booth>): Booth {
  return {
    id: "test-booth",
    number: "T100",
    hallId: "hall-east",
    showId: "show-winter-2027",
    pavilionId: "pav-amber",
    status: "sold",
    boothType: "inline",
    xFt: 30,
    yFt: 40,
    widthFt: 10,
    heightFt: 10,
    price: 3500,
    ...overrides,
  };
}

// ============================================================
// 18.1 — Color Palette: "Gem Show, Not Spreadsheet"
// ============================================================

describe("18.1 — Pavilion Colors (Gem-Inspired Palette)", () => {
  const expectedPavilionColors: Record<string, string> = {
    "pav-amber": "#D4890E",
    "pav-turquoise": "#2B9EB3",
    "pav-gemstone": "#7B4DAA",
    "pav-silver": "#8C9BAA",
    "pav-designer": "#C4727F",
    "pav-outdoor": "#6B8F5E",
  };

  test.each(Object.entries(expectedPavilionColors))(
    "pavilion %s has color %s",
    (id, expectedColor) => {
      const pav = mockData.pavilions.find((p) => p.id === id);
      expect(pav).toBeDefined();
      expect(pav!.color).toBe(expectedColor);
    }
  );

  test("all 6 pavilions are present", () => {
    expect(mockData.pavilions).toHaveLength(6);
  });
});

describe("18.1 — Status Colors", () => {
  test("available is green #3EAE6A", () => {
    expect(STATUS_COLORS.available).toBe("#3EAE6A");
  });

  test("sold is blue #2D6CCB (not red)", () => {
    expect(STATUS_COLORS.sold).toBe("#2D6CCB");
    // Explicitly verify it is NOT red
    expect(STATUS_COLORS.sold).not.toBe("#ef4444");
    expect(STATUS_COLORS.sold).not.toMatch(/^#[eEfF][0-9a-fA-F]/);
  });

  test("held is amber #E6A817", () => {
    expect(STATUS_COLORS.held).toBe("#E6A817");
  });

  test("blocked is slate gray #8B8F96", () => {
    expect(STATUS_COLORS.blocked).toBe("#8B8F96");
  });
});

// ============================================================
// 18.2 — Surface & Background Treatment
// ============================================================

describe("18.2 — Surface & Background Constants", () => {
  test("canvas background is warm off-white #F5F2EB", () => {
    expect(CANVAS_BG).toBe("#F5F2EB");
  });

  test("hall outlines are warm charcoal #3D3833", () => {
    expect(HALL_STROKE).toBe("#3D3833");
  });

  test("aisle areas are lighter shade #EDE9E1", () => {
    expect(AISLE_COLOR).toBe("#EDE9E1");
  });

  test("grid lines are faint #D6D1C8", () => {
    expect(GRID_COLOR).toBe("#D6D1C8");
  });

  test("toolbar background is white", () => {
    expect(TOOLBAR_BG).toBe("#FFFFFF");
  });

  test("toolbar border is subtle gray", () => {
    expect(TOOLBAR_BORDER).toBe("#E5E7EB");
  });

  test("hall fill indoor matches off-white", () => {
    expect(HALL_FILL_INDOOR).toBe("#F5F2EB");
  });

  test("hall fill outdoor matches aisle color", () => {
    expect(HALL_FILL_OUTDOOR).toBe("#EDE9E1");
  });
});

// ============================================================
// 18.3 — Booth Rectangle Styling
// ============================================================

describe("18.3 — Booth Opacity by Status", () => {
  test("sold booths have 0.85 opacity (solid, full confidence)", () => {
    const booth = makeBooth({ status: "sold" });
    expect(getBoothOpacity(booth)).toBe(0.85);
  });

  test("available booths have 0.40 opacity (lighter, inviting)", () => {
    const booth = makeBooth({ status: "available" });
    expect(getBoothOpacity(booth)).toBe(0.4);
  });

  test("held booths have 0.85 opacity", () => {
    const booth = makeBooth({ status: "held" });
    expect(getBoothOpacity(booth)).toBe(0.85);
  });

  test("blocked booths have 0.90 opacity", () => {
    const booth = makeBooth({ status: "blocked" });
    expect(getBoothOpacity(booth)).toBe(0.9);
  });
});

describe("18.3 — Booth Border Styling", () => {
  const amberColor = "#D4890E";

  test("sold booths get solid darker border", () => {
    const booth = makeBooth({ status: "sold" });
    const border = getBoothBorder(booth, amberColor);
    expect(border.stroke).toBe(darkenColor(amberColor, 0.2));
    expect(border.strokeWidth).toBe(1);
    expect(border.dash).toBeUndefined();
  });

  test("available booths get dashed border", () => {
    const booth = makeBooth({ status: "available" });
    const border = getBoothBorder(booth, amberColor);
    expect(border.dash).toBeDefined();
    expect(border.dash).toEqual([6, 4]);
  });

  test("held booths get solid border (stripes overlaid separately)", () => {
    const booth = makeBooth({ status: "held" });
    const border = getBoothBorder(booth, amberColor);
    expect(border.dash).toBeUndefined();
    expect(border.strokeWidth).toBe(1);
  });

  test("blocked booths get slate gray border", () => {
    const booth = makeBooth({ status: "blocked" });
    const border = getBoothBorder(booth, amberColor);
    expect(border.stroke).toBe("#6B6F75");
  });
});

describe("18.3 — Booth Corner Radius", () => {
  test("booth corner radius is 2px", () => {
    expect(BOOTH_CORNER_RADIUS).toBe(2);
  });
});

describe("18.3 — Selection Accent", () => {
  test("selection accent is #2563EB blue", () => {
    expect(SELECTION_ACCENT).toBe("#2563EB");
  });
});

// ============================================================
// 18.4 — Typography: Auto-Contrast
// ============================================================

describe("18.4 — Auto-Contrast Text Colors", () => {
  test("dark text on light backgrounds (e.g. Silver Jewelry #8C9BAA)", () => {
    // Silver is light enough that text should be dark
    expect(getAutoContrastText("#8C9BAA")).toBe("#2D2A26");
  });

  test("white text on dark backgrounds (e.g. Gemstone #7B4DAA)", () => {
    expect(getAutoContrastText("#7B4DAA")).toBe("#FFFFFF");
  });

  test("white text on very dark color (#1a1a2e)", () => {
    expect(getAutoContrastText("#1a1a2e")).toBe("#FFFFFF");
  });

  test("dark text on white (#FFFFFF)", () => {
    expect(getAutoContrastText("#FFFFFF")).toBe("#2D2A26");
  });

  test("white text on sold status blue (#2D6CCB)", () => {
    expect(getAutoContrastText("#2D6CCB")).toBe("#FFFFFF");
  });

  test("dark text on Amber (#D4890E) — luminance ~0.57", () => {
    // Amber has luminance > 0.5, so dark text is correct for readability
    const result = getAutoContrastText("#D4890E");
    expect(result).toBe("#2D2A26");
  });
});

describe("18.4 — Luminance Calculation", () => {
  test("black has luminance 0", () => {
    expect(getLuminance("#000000")).toBe(0);
  });

  test("white has luminance ~1", () => {
    expect(getLuminance("#FFFFFF")).toBeCloseTo(1, 2);
  });

  test("mid-gray has luminance ~0.5", () => {
    const lum = getLuminance("#808080");
    expect(lum).toBeGreaterThan(0.3);
    expect(lum).toBeLessThan(0.7);
  });
});

describe("18.4 — darkenColor utility", () => {
  test("darkening by 0 returns same color", () => {
    expect(darkenColor("#D4890E", 0)).toBe("#d4890e");
  });

  test("darkening by 1 returns black", () => {
    expect(darkenColor("#D4890E", 1)).toBe("#000000");
  });

  test("darkening by 0.2 returns darker shade", () => {
    const darker = darkenColor("#D4890E", 0.2);
    // Should be a valid hex
    expect(darker).toMatch(/^#[0-9a-f]{6}$/);
    // Should be darker (lower luminance)
    expect(getLuminance(darker)).toBeLessThan(getLuminance("#D4890E"));
  });
});

// ============================================================
// 18.5 — Toolbar & Legend Polish
// ============================================================

describe("18.5 — Toolbar Theme", () => {
  test("toolbar background is white (light theme)", () => {
    expect(TOOLBAR_BG).toBe("#FFFFFF");
  });

  test("toolbar border is light gray", () => {
    expect(TOOLBAR_BORDER).toBe("#E5E7EB");
  });

  test("blocked color is slate gray", () => {
    expect(BLOCKED_COLOR).toBe("#8B8F96");
  });
});

describe("18.5 — getBoothFill returns correct colors", () => {
  test("returns pavilion color in pavilion mode for sold booth", () => {
    const booth = makeBooth({ status: "sold", pavilionId: "pav-amber" });
    const fill = getBoothFill(booth, pavilionMap, "pavilion");
    expect(fill).toBe("#D4890E");
  });

  test("returns BLOCKED_COLOR for blocked booth in pavilion mode", () => {
    const booth = makeBooth({ status: "blocked", pavilionId: "pav-amber" });
    const fill = getBoothFill(booth, pavilionMap, "pavilion");
    expect(fill).toBe("#8B8F96");
  });

  test("returns status color in status mode", () => {
    const booth = makeBooth({ status: "sold" });
    const fill = getBoothFill(booth, pavilionMap, "status");
    expect(fill).toBe("#2D6CCB");
  });

  test("returns available status color (green) in status mode", () => {
    const booth = makeBooth({ status: "available" });
    const fill = getBoothFill(booth, pavilionMap, "status");
    expect(fill).toBe("#3EAE6A");
  });
});
