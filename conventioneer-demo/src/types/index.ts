// --- Core Domain Types for Conventioneer Floor Plan ---

export type VenueType = "owned" | "rental";

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  city: string;
  state: string;
  /** Total venue footprint in feet */
  widthFt: number;
  heightFt: number;
}

export interface Hall {
  id: string;
  venueId: string;
  name: string;
  /** Position within the venue coordinate space (feet) */
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  /** Whether this hall is indoor or outdoor */
  indoor: boolean;
}

export interface Pavilion {
  id: string;
  name: string;
  /** Hex color for booth fill */
  color: string;
  /** Short code shown in legends */
  code: string;
}

export type BoothStatus = "sold" | "available" | "held" | "blocked";
export type BoothType = "inline" | "corner" | "island" | "outdoor";

export interface Booth {
  id: string;
  /** Display number, e.g. "A101" */
  number: string;
  hallId: string;
  showId: string;
  pavilionId: string;
  status: BoothStatus;
  boothType: BoothType;
  /** Position in hall-local coordinates (feet) */
  xFt: number;
  yFt: number;
  widthFt: number;
  heightFt: number;
  /** Base price in USD */
  price: number;
  /** Exhibitor name when sold */
  exhibitorName?: string;
  /** Admin notes */
  notes?: string;
}

export interface Show {
  id: string;
  name: string;
  venueId: string;
  /** Which halls are used by this show */
  hallIds: string[];
  startDate: string;
  endDate: string;
}

export interface MockData {
  venues: Venue[];
  halls: Hall[];
  pavilions: Pavilion[];
  shows: Show[];
  booths: Booth[];
}
