import type { Booth, Pavilion, BoothStatus } from "@/types";

export const BLOCKED_COLOR = "#8B8F96";

export const STATUS_COLORS: Record<BoothStatus, string> = {
  available: "#3EAE6A",
  sold: "#2D6CCB",
  held: "#E6A817",
  blocked: "#8B8F96",
};

// --- Theme constants (18.2) ---
export const CANVAS_BG = "#F5F2EB";
export const HALL_STROKE = "#3D3833";
export const HALL_FILL_INDOOR = "#F5F2EB";
export const HALL_FILL_OUTDOOR = "#EDE9E1";
export const AISLE_COLOR = "#EDE9E1";
export const GRID_COLOR = "#D6D1C8";
export const GRID_MAJOR_COLOR = "#C8C3BA";
export const TOOLBAR_BG = "#FFFFFF";
export const TOOLBAR_BORDER = "#E5E7EB";

// --- Booth styling constants (18.3) ---
export const BOOTH_CORNER_RADIUS = 2;
export const SELECTION_ACCENT = "#2563EB";

export type ColorMode = "pavilion" | "status";

/**
 * Darken a hex color by a given amount (0-1).
 * Used to compute booth border colors from pavilion colors.
 */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Compute relative luminance of a hex color.
 * Returns a value between 0 (black) and 1 (white).
 */
export function getLuminance(hex: string): number {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = ((num >> 16) & 0xff) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  // Simplified sRGB luminance
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Auto-contrast: returns dark text on light backgrounds, white text on dark.
 */
export function getAutoContrastText(bgHex: string): string {
  return getLuminance(bgHex) > 0.5 ? "#2D2A26" : "#FFFFFF";
}

export function getBoothFill(
  booth: Booth,
  pavilionMap: Map<string, Pavilion>,
  colorMode: ColorMode = "pavilion"
): string {
  if (colorMode === "status") {
    return STATUS_COLORS[booth.status] || "#666";
  }
  if (booth.status === "blocked") return BLOCKED_COLOR;
  const pav = pavilionMap.get(booth.pavilionId);
  return pav ? pav.color : "#666";
}

/**
 * Get booth fill opacity based on status (18.3).
 * - sold: 0.85 (solid, full confidence)
 * - available: 0.40 (lighter, inviting)
 * - held: 0.85 (full color, stripes overlaid separately)
 * - blocked: 0.90 (solid slate)
 */
export function getBoothOpacity(booth: Booth): number {
  switch (booth.status) {
    case "available":
      return 0.4;
    case "held":
      return 0.85;
    case "blocked":
      return 0.9;
    case "sold":
    default:
      return 0.85;
  }
}

/**
 * Get booth border style based on status (18.3).
 * Returns { stroke, strokeWidth (base), dash? }
 */
export function getBoothBorder(
  booth: Booth,
  pavilionColor: string
): { stroke: string; strokeWidth: number; dash?: number[] } {
  if (booth.status === "blocked") {
    return { stroke: "#6B6F75", strokeWidth: 1 };
  }
  if (booth.status === "available") {
    return {
      stroke: darkenColor(pavilionColor, 0.2),
      strokeWidth: 1,
      dash: [6, 4],
    };
  }
  // sold + held: solid darker border
  return {
    stroke: darkenColor(pavilionColor, 0.2),
    strokeWidth: 1,
  };
}
