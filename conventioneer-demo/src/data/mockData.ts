import type {
  Venue,
  Hall,
  Pavilion,
  Show,
  Booth,
  BoothStatus,
  BoothType,
  MockData,
} from "@/types";

// ============================================================
// Venues
// ============================================================

export const venues: Venue[] = [
  {
    id: "venue-tucson",
    name: "Tucson Expo Center",
    type: "owned",
    city: "Tucson",
    state: "AZ",
    widthFt: 1200,
    heightFt: 800,
  },
  {
    id: "venue-lv",
    name: "World Market Center Las Vegas",
    type: "rental",
    city: "Las Vegas",
    state: "NV",
    widthFt: 1400,
    heightFt: 900,
  },
  {
    id: "venue-sd",
    name: "San Diego Convention Center",
    type: "rental",
    city: "San Diego",
    state: "CA",
    widthFt: 1600,
    heightFt: 1000,
  },
];

// ============================================================
// Halls (Tucson only for this show)
// ============================================================

export const halls: Hall[] = [
  {
    id: "hall-east",
    venueId: "venue-tucson",
    name: "East Hall",
    xFt: 20,
    yFt: 20,
    widthFt: 550,
    heightFt: 350,
    indoor: true,
  },
  {
    id: "hall-west",
    venueId: "venue-tucson",
    name: "West Hall",
    xFt: 620,
    yFt: 20,
    widthFt: 550,
    heightFt: 350,
    indoor: true,
  },
  {
    id: "hall-north",
    venueId: "venue-tucson",
    name: "North Hall",
    xFt: 20,
    yFt: 400,
    widthFt: 550,
    heightFt: 350,
    indoor: true,
  },
  {
    id: "hall-south",
    venueId: "venue-tucson",
    name: "South Hall",
    xFt: 620,
    yFt: 400,
    widthFt: 550,
    heightFt: 350,
    indoor: true,
  },
  {
    id: "hall-outdoor",
    venueId: "venue-tucson",
    name: "Outdoor Bazaar",
    xFt: 300,
    yFt: 760,
    widthFt: 600,
    heightFt: 30,
    indoor: false,
  },
];

// ============================================================
// Pavilions (6 with distinct colors)
// ============================================================

export const pavilions: Pavilion[] = [
  { id: "pav-amber", name: "Amber Pavilion", color: "#D4890E", code: "AMB" },
  {
    id: "pav-turquoise",
    name: "Southwest / Turquoise Pavilion",
    color: "#2B9EB3",
    code: "SWT",
  },
  {
    id: "pav-gemstone",
    name: "International Gemstone Pavilion",
    color: "#7B4DAA",
    code: "GEM",
  },
  {
    id: "pav-silver",
    name: "Silver Jewelry Pavilion",
    color: "#8C9BAA",
    code: "SLV",
  },
  {
    id: "pav-designer",
    name: "Designer Jewelry Pavilion",
    color: "#C4727F",
    code: "DES",
  },
  {
    id: "pav-outdoor",
    name: "Outdoor Dealers Pavilion",
    color: "#6B8F5E",
    code: "OUT",
  },
];

// ============================================================
// Shows
// ============================================================

export const shows: Show[] = [
  {
    id: "show-winter-2027",
    name: "JOGS Winter 2027",
    venueId: "venue-tucson",
    hallIds: ["hall-east", "hall-west", "hall-outdoor"],
    startDate: "2027-01-28",
    endDate: "2027-02-08",
  },
];

// ============================================================
// Booth generation helpers
// ============================================================

const EXHIBITOR_NAMES = [
  "Tucson Gems Co.",
  "Silver Crest",
  "Amber World",
  "Gem Galaxy",
  "Navajo Spirit",
  "Desert Turquoise",
  "Thai Silver House",
  "Bali Stones",
  "Madagascar Minerals",
  "Sri Lanka Sapphires",
  "Mumbai Jewels",
  "Jaipur Collection",
  "African Opals",
  "Brazilian Amethyst Co.",
  "Colombian Emeralds",
  "Peruvian Silver",
  "Ethiopian Opal House",
  "Mexican Fire Opal",
  "Chinese Jade Traders",
  "Australian Boulder Opal",
  "Tahitian Pearl Co.",
  "Japanese Akoya House",
  "Italian Gold Designs",
  "Greek Silver Works",
  "Turkish Agate Co.",
  "German Crystal",
  "Czech Garnet House",
  "Polish Amber Palace",
  "Baltic Amber Direct",
  "Scandinavian Silver",
  "Arizona Peridot",
  "Montana Sapphire Co.",
  "Oregon Sunstone",
  "Maine Tourmaline",
  "North Carolina Gems",
  "Zuni Fetish Gallery",
  "Hopi Silver Arts",
  "Santa Fe Jewelry Co.",
  "Sedona Stones",
  "Grand Canyon Gems",
  "Pacific Pearls",
  "Coral Reef Jewelry",
  "Deep Sea Treasures",
  "Mountain Gems Ltd.",
  "River Stone Designs",
  "Prairie Gold",
  "Southwest Designs",
  "Desert Rose Jewelry",
  "Canyon Silversmith",
  "Mesa Verde Crafts",
];

/** Deterministic pseudo-random from seed (simple LCG) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickStatus(rand: () => number): BoothStatus {
  const r = rand();
  if (r < 0.6) return "sold";
  if (r < 0.8) return "available";
  if (r < 0.9) return "held";
  return "blocked";
}

interface BoothLayout {
  hallId: string;
  prefix: string;
  pavilionIds: string[];
  /** Starting x,y inside the hall (feet from hall origin) */
  startXFt: number;
  startYFt: number;
  cols: number;
  rows: number;
  /** Aisle gap every N columns */
  aisleEvery: number;
  /** Aisle width in feet */
  aisleFt: number;
  /** Mix of booth sizes: [widthFt, heightFt, weight] */
  sizes: [number, number, number][];
}

const layouts: BoothLayout[] = [
  // East Hall - Amber + Turquoise pavilions
  {
    hallId: "hall-east",
    prefix: "E",
    pavilionIds: ["pav-amber", "pav-turquoise"],
    startXFt: 30,
    startYFt: 40,
    cols: 10,
    rows: 4,
    aisleEvery: 5,
    aisleFt: 10,
    sizes: [
      [10, 10, 70],
      [10, 20, 20],
      [20, 20, 10],
    ],
  },
  // West Hall - Gemstone + Silver pavilions
  {
    hallId: "hall-west",
    prefix: "W",
    pavilionIds: ["pav-gemstone", "pav-silver"],
    startXFt: 30,
    startYFt: 40,
    cols: 10,
    rows: 4,
    aisleEvery: 5,
    aisleFt: 10,
    sizes: [
      [10, 10, 70],
      [10, 20, 20],
      [20, 20, 10],
    ],
  },
  // Outdoor Bazaar - Outdoor + Designer pavilions
  {
    hallId: "hall-outdoor",
    prefix: "O",
    pavilionIds: ["pav-outdoor", "pav-designer"],
    startXFt: 10,
    startYFt: 5,
    cols: 14,
    rows: 1,
    aisleEvery: 7,
    aisleFt: 10,
    sizes: [
      [10, 10, 100],
    ],
  },
];

function generateBooths(): Booth[] {
  const rand = seededRandom(42);
  const booths: Booth[] = [];
  let nameIdx = 0;

  for (const layout of layouts) {
    let boothNum = 100;
    let curX = layout.startXFt;
    let curY = layout.startYFt;
    let colInGroup = 0;

    for (let row = 0; row < layout.rows; row++) {
      curX = layout.startXFt;
      colInGroup = 0;

      for (let col = 0; col < layout.cols; col++) {
        // Pick size based on weighted random
        const sizeRoll = rand() * 100;
        let cumulative = 0;
        let widthFt = 10;
        let heightFt = 10;
        for (const [w, h, weight] of layout.sizes) {
          cumulative += weight;
          if (sizeRoll < cumulative) {
            widthFt = w;
            heightFt = h;
            break;
          }
        }

        // For larger booths, check if they fit in the remaining hall space
        // If a 20x20 would push past the row count, shrink to 10x10
        if (heightFt === 20 && row === layout.rows - 1) {
          heightFt = 10;
        }
        if (widthFt === 20 && col === layout.cols - 1) {
          widthFt = 10;
        }

        const pavilionId =
          layout.pavilionIds[
            Math.floor(rand() * layout.pavilionIds.length)
          ];

        const status = pickStatus(rand);

        // Determine booth type based on size and position
        let boothType: BoothType = "inline";
        if (widthFt >= 20 && heightFt >= 20) boothType = "island";
        else if (col === 0 || col === layout.cols - 1) boothType = "corner";
        if (!layout.hallId.includes("outdoor") === false) boothType = "outdoor";

        // Price based on size and type
        const sqft = widthFt * heightFt;
        const pricePerSqft = boothType === "island" ? 40 : boothType === "corner" ? 38 : 35;
        const price = sqft * pricePerSqft;

        const booth: Booth = {
          id: `booth-${layout.prefix}-${boothNum}`,
          number: `${layout.prefix}${boothNum}`,
          hallId: layout.hallId,
          showId: "show-winter-2027",
          pavilionId,
          status,
          boothType,
          xFt: curX,
          yFt: curY,
          widthFt,
          heightFt,
          price,
          exhibitorName:
            status === "sold"
              ? EXHIBITOR_NAMES[nameIdx++ % EXHIBITOR_NAMES.length]
              : undefined,
          notes: status === "held" ? "Hold expires in 48 hours" : undefined,
        };

        booths.push(booth);
        boothNum++;

        curX += widthFt;
        colInGroup++;

        // Insert aisle gap
        if (colInGroup >= layout.aisleEvery) {
          curX += layout.aisleFt;
          colInGroup = 0;
        }
      }

      // Move to next row - use max possible booth height + gap
      curY += 30; // 20ft max height + 10ft aisle
    }
  }

  return booths;
}

export const booths: Booth[] = generateBooths();

// ============================================================
// Aggregated export
// ============================================================

export const mockData: MockData = {
  venues,
  halls,
  pavilions,
  shows,
  booths,
};

export default mockData;

// ============================================================
// Cloneable Shows (for Clone From feature - Ticket 15)
// ============================================================

export interface CloneableShow {
  show: Show;
  booths: Booth[];
}

function generateCloneBooths(
  showId: string,
  seed: number,
  cloneLayouts: BoothLayout[]
): Booth[] {
  const rand = seededRandom(seed);
  const cloneBooths: Booth[] = [];
  let nameIdx = 0;

  for (const layout of cloneLayouts) {
    let boothNum = 100;
    let curX = layout.startXFt;
    let curY = layout.startYFt;
    let colInGroup = 0;

    for (let row = 0; row < layout.rows; row++) {
      curX = layout.startXFt;
      colInGroup = 0;

      for (let col = 0; col < layout.cols; col++) {
        const sizeRoll = rand() * 100;
        let cumulative = 0;
        let widthFt = 10;
        let heightFt = 10;
        for (const [w, h, weight] of layout.sizes) {
          cumulative += weight;
          if (sizeRoll < cumulative) {
            widthFt = w;
            heightFt = h;
            break;
          }
        }

        if (heightFt === 20 && row === layout.rows - 1) heightFt = 10;
        if (widthFt === 20 && col === layout.cols - 1) widthFt = 10;

        const pavilionId =
          layout.pavilionIds[Math.floor(rand() * layout.pavilionIds.length)];
        const status = pickStatus(rand);

        let boothType: BoothType = "inline";
        if (widthFt >= 20 && heightFt >= 20) boothType = "island";
        else if (col === 0 || col === layout.cols - 1) boothType = "corner";

        const sqft = widthFt * heightFt;
        const pricePerSqft =
          boothType === "island" ? 40 : boothType === "corner" ? 38 : 35;
        const price = sqft * pricePerSqft;

        cloneBooths.push({
          id: `booth-${layout.prefix}-${boothNum}-${showId}`,
          number: `${layout.prefix}${boothNum}`,
          hallId: layout.hallId,
          showId,
          pavilionId,
          status,
          boothType,
          xFt: curX,
          yFt: curY,
          widthFt,
          heightFt,
          price,
          exhibitorName:
            status === "sold"
              ? EXHIBITOR_NAMES[nameIdx++ % EXHIBITOR_NAMES.length]
              : undefined,
          notes: status === "held" ? "Hold expires in 48 hours" : undefined,
        });

        boothNum++;
        curX += widthFt;
        colInGroup++;

        if (colInGroup >= layout.aisleEvery) {
          curX += layout.aisleFt;
          colInGroup = 0;
        }
      }

      curY += 30;
    }
  }

  return cloneBooths;
}

// JOGS Winter 2026 — slightly fewer booths (8 cols instead of 10 in halls, same outdoor)
const winter2026Layouts: BoothLayout[] = [
  {
    hallId: "hall-east",
    prefix: "E",
    pavilionIds: ["pav-amber", "pav-turquoise"],
    startXFt: 30,
    startYFt: 40,
    cols: 8,
    rows: 4,
    aisleEvery: 4,
    aisleFt: 10,
    sizes: [
      [10, 10, 70],
      [10, 20, 20],
      [20, 20, 10],
    ],
  },
  {
    hallId: "hall-west",
    prefix: "W",
    pavilionIds: ["pav-gemstone", "pav-silver"],
    startXFt: 30,
    startYFt: 40,
    cols: 8,
    rows: 4,
    aisleEvery: 4,
    aisleFt: 10,
    sizes: [
      [10, 10, 70],
      [10, 20, 20],
      [20, 20, 10],
    ],
  },
  {
    hallId: "hall-outdoor",
    prefix: "O",
    pavilionIds: ["pav-outdoor", "pav-designer"],
    startXFt: 10,
    startYFt: 5,
    cols: 12,
    rows: 1,
    aisleEvery: 6,
    aisleFt: 10,
    sizes: [[10, 10, 100]],
  },
];

// JOGS Fall 2026 — more booths (12 cols, 5 rows in halls, larger outdoor)
const fall2026Layouts: BoothLayout[] = [
  {
    hallId: "hall-east",
    prefix: "E",
    pavilionIds: ["pav-amber", "pav-turquoise"],
    startXFt: 30,
    startYFt: 40,
    cols: 12,
    rows: 5,
    aisleEvery: 6,
    aisleFt: 10,
    sizes: [
      [10, 10, 75],
      [10, 20, 15],
      [20, 20, 10],
    ],
  },
  {
    hallId: "hall-west",
    prefix: "W",
    pavilionIds: ["pav-gemstone", "pav-silver"],
    startXFt: 30,
    startYFt: 40,
    cols: 12,
    rows: 5,
    aisleEvery: 6,
    aisleFt: 10,
    sizes: [
      [10, 10, 75],
      [10, 20, 15],
      [20, 20, 10],
    ],
  },
  {
    hallId: "hall-outdoor",
    prefix: "O",
    pavilionIds: ["pav-outdoor", "pav-designer"],
    startXFt: 10,
    startYFt: 5,
    cols: 16,
    rows: 1,
    aisleEvery: 8,
    aisleFt: 10,
    sizes: [[10, 10, 100]],
  },
];

export const cloneableShows: CloneableShow[] = [
  {
    show: {
      id: "show-winter-2026",
      name: "JOGS Winter 2026",
      venueId: "venue-tucson",
      hallIds: ["hall-east", "hall-west", "hall-outdoor"],
      startDate: "2026-01-28",
      endDate: "2026-02-08",
    },
    booths: generateCloneBooths("show-winter-2026", 99, winter2026Layouts),
  },
  {
    show: {
      id: "show-fall-2026",
      name: "JOGS Fall 2026",
      venueId: "venue-tucson",
      hallIds: ["hall-east", "hall-west", "hall-outdoor"],
      startDate: "2026-09-10",
      endDate: "2026-09-20",
    },
    booths: generateCloneBooths("show-fall-2026", 77, fall2026Layouts),
  },
];
