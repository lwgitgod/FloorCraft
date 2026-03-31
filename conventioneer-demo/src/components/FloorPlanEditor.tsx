"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Line, Text, Group, Circle } from "react-konva";
import Konva from "konva";
import { mockData, cloneableShows } from "@/data/mockData";
import type { Booth, Hall, Pavilion, BoothStatus, BoothType } from "@/types";
import {
  STATUS_COLORS,
  getBoothFill,
  getBoothOpacity as getBoothOpacityUtil,
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
} from "@/utils/boothColors";
import type { ColorMode } from "@/utils/boothColors";

// --- Constants ---

const TOOLBAR_HEIGHT = 96;
const VENUE_WIDTH_FT = 1200;
const VENUE_HEIGHT_FT = 800;
const FT_TO_PX = 5;
const VENUE_WIDTH_PX = VENUE_WIDTH_FT * FT_TO_PX;
const VENUE_HEIGHT_PX = VENUE_HEIGHT_FT * FT_TO_PX;
const GRID_SPACING_FT = 10;
const GRID_SPACING_PX = GRID_SPACING_FT * FT_TO_PX;
const MIN_SCALE = 0.05;
const MAX_SCALE = 5;
const GRID_VISIBLE_SCALE = 0.5;
const SELECTION_COLOR = SELECTION_ACCENT;
const PANEL_WIDTH = 320;
const MIN_BOOTH_SIZE_FT = 8;
const HANDLE_SIZE = 8; // visual pixel size of resize handles

// --- Helpers ---

function buildPavilionMap(pavilions: Pavilion[]): Map<string, Pavilion> {
  const map = new Map<string, Pavilion>();
  for (const p of pavilions) map.set(p.id, p);
  return map;
}

function buildHallMap(halls: Hall[]): Map<string, Hall> {
  const map = new Map<string, Hall>();
  for (const h of halls) map.set(h.id, h);
  return map;
}

// getBoothFill is imported from @/utils/boothColors

function getBoothOpacity(booth: Booth): number {
  return getBoothOpacityUtil(booth);
}

// --- Properties Panel ---

interface PropertiesPanelProps {
  selectedBooths: Booth[];
  pavilions: Pavilion[];
  onUpdateBooth: (id: string, updates: Partial<Booth>) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Booth>) => void;
  onDeleteBooths: () => void;
  onClose: () => void;
}

function PropertiesPanel({
  selectedBooths,
  pavilions,
  onUpdateBooth,
  onBulkUpdate,
  onDeleteBooths,
  onClose,
}: PropertiesPanelProps) {
  const isMulti = selectedBooths.length > 1;
  const booth = selectedBooths[0];

  if (!booth) return null;

  const pavilion = pavilions.find((p) => p.id === booth.pavilionId);

  const handleBulkChange = (updates: Partial<Booth>) => {
    onBulkUpdate(
      selectedBooths.map((b) => b.id),
      updates
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        top: TOOLBAR_HEIGHT,
        right: 0,
        width: PANEL_WIDTH,
        height: `calc(100vh - ${TOOLBAR_HEIGHT}px)`,
        background: "#FFFFFF",
        borderLeft: `1px solid ${TOOLBAR_BORDER}`,
        overflowY: "auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        color: "#2D2A26",
        zIndex: 10,
        boxShadow: "-2px 0 8px rgba(0,0,0,0.06)",
      }}
      data-testid="properties-panel"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>
          {isMulti
            ? `${selectedBooths.length} booths selected`
            : `Booth ${booth.number}`}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            fontSize: 20,
            cursor: "pointer",
            padding: "0 4px",
          }}
          data-testid="panel-close"
        >
          ×
        </button>
      </div>

      {isMulti ? (
        /* ---- Multi-selection bulk edit ---- */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FieldRow label="Pavilion">
            <select
              value=""
              onChange={(e) =>
                handleBulkChange({ pavilionId: e.target.value })
              }
              style={selectStyle}
              data-testid="bulk-pavilion"
            >
              <option value="">— Change All —</option>
              {pavilions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Status">
            <select
              value=""
              onChange={(e) =>
                handleBulkChange({
                  status: e.target.value as BoothStatus,
                })
              }
              style={selectStyle}
              data-testid="bulk-status"
            >
              <option value="">— Change All —</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="held">Held</option>
              <option value="blocked">Blocked</option>
            </select>
          </FieldRow>
          <FieldRow label="Type">
            <select
              value=""
              onChange={(e) =>
                handleBulkChange({
                  boothType: e.target.value as BoothType,
                })
              }
              style={selectStyle}
              data-testid="bulk-type"
            >
              <option value="">— Change All —</option>
              <option value="inline">Inline</option>
              <option value="corner">Corner</option>
              <option value="island">Island</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </FieldRow>

          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "#F5F2EB",
              borderRadius: 4,
              fontSize: 12,
              color: "#666",
            }}
          >
            Selected: {selectedBooths.map((b) => b.number).join(", ")}
          </div>

          <button
            onClick={onDeleteBooths}
            style={{
              marginTop: 12,
              background: "#dc2626",
              border: "1px solid #dc2626",
              borderRadius: 4,
              color: "#ffffff",
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              width: "100%",
            }}
            data-testid="delete-booth-btn"
          >
            Delete {selectedBooths.length > 1 ? `${selectedBooths.length} Booths` : "Booth"}
          </button>
        </div>
      ) : (
        /* ---- Single selection detail ---- */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Dimensions */}
          <FieldRow label="Dimensions">
            <span style={{ fontFamily: "monospace", fontSize: 14 }}>
              {booth.widthFt} × {booth.heightFt} ft
            </span>
          </FieldRow>
          <FieldRow label="Square Footage">
            <span style={{ fontFamily: "monospace", fontSize: 14 }}>
              {booth.widthFt * booth.heightFt} sq ft
            </span>
          </FieldRow>

          {/* Pavilion badge */}
          <FieldRow label="Pavilion">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: pavilion?.color ?? "#666",
                  display: "inline-block",
                }}
              />
              <select
                value={booth.pavilionId}
                onChange={(e) =>
                  onUpdateBooth(booth.id, { pavilionId: e.target.value })
                }
                style={selectStyle}
                data-testid="single-pavilion"
              >
                {pavilions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </FieldRow>

          {/* Booth type */}
          <FieldRow label="Type">
            <select
              value={booth.boothType}
              onChange={(e) =>
                onUpdateBooth(booth.id, {
                  boothType: e.target.value as BoothType,
                })
              }
              style={selectStyle}
              data-testid="single-type"
            >
              <option value="inline">Inline</option>
              <option value="corner">Corner</option>
              <option value="island">Island</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </FieldRow>

          {/* Status */}
          <FieldRow label="Status">
            <select
              value={booth.status}
              onChange={(e) =>
                onUpdateBooth(booth.id, {
                  status: e.target.value as BoothStatus,
                })
              }
              style={selectStyle}
              data-testid="single-status"
            >
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="held">Held</option>
              <option value="blocked">Blocked</option>
            </select>
          </FieldRow>

          {/* Exhibitor */}
          <FieldRow label="Exhibitor">
            <span
              style={{
                color: booth.exhibitorName ? "#2D2A26" : "#999",
                fontStyle: booth.exhibitorName ? "normal" : "italic",
                fontSize: 13,
              }}
            >
              {booth.exhibitorName || "Available"}
            </span>
          </FieldRow>

          {/* Price */}
          <FieldRow label="Price">
            <span style={{ fontFamily: "monospace", fontSize: 14, color: "#2D6CCB" }}>
              ${booth.price.toLocaleString()}
            </span>
          </FieldRow>

          {/* Notes */}
          <FieldRow label="Notes">
            <textarea
              value={booth.notes || ""}
              onChange={(e) =>
                onUpdateBooth(booth.id, { notes: e.target.value })
              }
              placeholder="Add notes..."
              style={{
                background: "#F5F2EB",
                border: `1px solid ${TOOLBAR_BORDER}`,
                borderRadius: 4,
                color: "#2D2A26",
                padding: "6px 8px",
                fontSize: 12,
                resize: "vertical",
                minHeight: 48,
                width: "100%",
              }}
              data-testid="single-notes"
            />
          </FieldRow>

          <button
            onClick={onDeleteBooths}
            style={{
              marginTop: 12,
              background: "#dc2626",
              border: "1px solid #dc2626",
              borderRadius: 4,
              color: "#ffffff",
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              width: "100%",
            }}
            data-testid="delete-booth-btn"
          >
            Delete Booth
          </button>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#F5F2EB",
  border: `1px solid #D6D1C8`,
  borderRadius: 4,
  color: "#2D2A26",
  padding: "4px 8px",
  fontSize: 13,
  width: "100%",
};

const rowGenInputStyle: React.CSSProperties = {
  background: "#F5F2EB",
  border: `1px solid #D6D1C8`,
  borderRadius: 4,
  color: "#2D2A26",
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
};

function RowGenField({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div
        style={{
          fontSize: 11,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// --- Main Component ---

export default function FloorPlanEditor() {
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(0.15);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  // Booth state (mutable copy of mock data)
  const [booths, setBooths] = useState<Booth[]>(() => [...mockData.booths]);

  // --- Undo / Redo ---
  const MAX_UNDO = 20;
  const undoStackRef = useRef<Booth[][]>([]);
  const redoStackRef = useRef<Booth[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // We need a ref to the current booths so the wrapper can read it synchronously
  const boothsRef = useRef<Booth[]>(booths);
  boothsRef.current = booths;

  /** Wrap setBooths so every mutation records history */
  const setBoothsWithHistory = useCallback(
    (updater: Booth[] | ((prev: Booth[]) => Booth[])) => {
      // Snapshot current state before mutation
      undoStackRef.current = [
        ...undoStackRef.current.slice(-(MAX_UNDO - 1)),
        boothsRef.current,
      ];
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      setBooths(updater);
    },
    []
  );

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, boothsRef.current];
    setBooths(prev);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, boothsRef.current];
    setBooths(next);
    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(true);
  }, []);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pavilionMap = useMemo(
    () => buildPavilionMap(mockData.pavilions),
    []
  );
  const hallMap = useMemo(() => buildHallMap(mockData.halls), []);

  const activeShow = mockData.shows[0];
  const activeHallIds = useMemo(() => new Set(activeShow.hallIds), [activeShow]);
  const activeHalls = useMemo(
    () => mockData.halls.filter((h) => activeHallIds.has(h.id)),
    [activeHallIds]
  );
  const activeBooths = useMemo(
    () => booths.filter((b) => activeHallIds.has(b.hallId)),
    [booths, activeHallIds]
  );

  const selectedBooths = useMemo(
    () => activeBooths.filter((b) => selectedIds.has(b.id)),
    [activeBooths, selectedIds]
  );

  const [colorMode, setColorMode] = useState<ColorMode>("pavilion");

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string>>(new Set());
  const searchActive = searchQuery.trim().length > 0;

  // --- Pavilion filter state ---
  const [activePavilionFilters, setActivePavilionFilters] = useState<Set<string>>(new Set());
  const pavilionFilterActive = activePavilionFilters.size > 0;

  // Glow animation phase for search-matched booths
  const [glowPhase, setGlowPhase] = useState(0);
  useEffect(() => {
    if (!searchActive) return;
    let frame: number;
    const animate = () => {
      setGlowPhase((prev) => (prev + 0.05) % (Math.PI * 2));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [searchActive]);

  // Compute search matches and auto-pan to first result
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchMatchIds(new Set());
      return;
    }

    const matches = new Set<string>();
    for (const booth of activeBooths) {
      const numberMatch = booth.number.toLowerCase().includes(q);
      const nameMatch = booth.exhibitorName
        ? booth.exhibitorName.toLowerCase().includes(q)
        : false;
      if (numberMatch || nameMatch) {
        matches.add(booth.id);
      }
    }
    setSearchMatchIds(matches);

    // Auto-pan to center on the first match
    if (matches.size > 0) {
      const firstMatchId = matches.values().next().value;
      const firstBooth = activeBooths.find((b) => b.id === firstMatchId);
      if (firstBooth) {
        const hall = hallMap.get(firstBooth.hallId);
        if (hall) {
          const centerWorldX =
            (hall.xFt + firstBooth.xFt + firstBooth.widthFt / 2) * FT_TO_PX;
          const centerWorldY =
            (hall.yFt + firstBooth.yFt + firstBooth.heightFt / 2) * FT_TO_PX;

          const targetScale = Math.max(scale, 0.4);
          // Use full viewport width for centering (search typically happens before selection)
          const vpWidth = stageSize.width;
          const vpHeight = stageSize.height;

          const newX = vpWidth / 2 - centerWorldX * targetScale;
          const newY = vpHeight / 2 - centerWorldY * targetScale;

          setScale(targetScale);
          setPosition({ x: newX, y: newY });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeBooths, hallMap]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchMatchIds(new Set());
  }, []);

  // --- Row Generator state ---
  const [rowGeneratorOpen, setRowGeneratorOpen] = useState(false);
  const [rowConfig, setRowConfig] = useState({
    numBooths: 10,
    boothWidth: 10,
    boothDepth: 10,
    aisleGap: 8,
    prefix: "A",
    startNum: 1,
    direction: "horizontal" as "horizontal" | "vertical",
  });
  const [placingRow, setPlacingRow] = useState<typeof rowConfig | null>(null);
  const [placingSingleBooth, setPlacingSingleBooth] = useState(false);

  // --- Clone From state (Ticket 15) ---
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneConfirmShow, setCloneConfirmShow] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // --- Context Menu state ---
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    /** The booth that was right-clicked, or null if empty canvas */
    boothId: string | null;
    /** Venue feet where right-click happened (for "Add Booth Here") */
    venueFtX: number;
    venueFtY: number;
  } | null>(null);

  // --- Auto-Number state ---
  const [autoNumberOpen, setAutoNumberOpen] = useState(false);
  const [autoNumberConfig, setAutoNumberConfig] = useState({
    prefix: "",
    startNum: 101,
    direction: "ltr" as "ltr" | "ttb",
  });

  // Resize state — stores anchor corner in hall-local feet and hallId for coordinate conversion
  const resizingRef = useRef<{
    boothId: string;
    corner: "tl" | "tr" | "bl" | "br";
    /** The anchor corner position in hall-local feet (stays fixed) */
    anchorXFt: number;
    anchorYFt: number;
    hallXFt: number;
    hallYFt: number;
  } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTooltip, setResizeTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const boothStats = useMemo(() => {
    const counts = { sold: 0, available: 0, held: 0, blocked: 0 };
    for (const b of activeBooths) {
      counts[b.status]++;
    }
    return { total: activeBooths.length, ...counts };
  }, [activeBooths]);

  const panelOpen = selectedBooths.length > 0;

  // Set crosshair cursor when in placement mode
  useEffect(() => {
    if (placingRow || placingSingleBooth) {
      document.body.style.cursor = "crosshair";
      return () => {
        document.body.style.cursor = "";
      };
    }
  }, [placingRow, placingSingleBooth]);

  // Resize handler
  useEffect(() => {
    function handleResize() {
      setStageSize({
        width: window.innerWidth,
        height: window.innerHeight - TOOLBAR_HEIGHT,
      });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Zoom on scroll wheel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const factor = 1.1;
      const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };
      setScale(clampedScale);
      setPosition({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    },
    [scale, position]
  );

  // Pan by dragging empty space
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (e.target === stageRef.current) {
        setPosition({ x: e.target.x(), y: e.target.y() });
      }
    },
    []
  );

  // Place a row of booths at the clicked position
  const handlePlaceRow = useCallback(
    (pointerX: number, pointerY: number) => {
      if (!placingRow) return;

      // Convert screen pointer to venue feet
      const venueFtX = (pointerX - position.x) / scale / FT_TO_PX;
      const venueFtY = (pointerY - position.y) / scale / FT_TO_PX;

      // Snap to grid
      const snappedVenueX =
        Math.round(venueFtX / GRID_SPACING_FT) * GRID_SPACING_FT;
      const snappedVenueY =
        Math.round(venueFtY / GRID_SPACING_FT) * GRID_SPACING_FT;

      // Determine which hall was clicked
      let targetHall: Hall | null = null;
      for (const hall of activeHalls) {
        if (
          snappedVenueX >= hall.xFt &&
          snappedVenueX < hall.xFt + hall.widthFt &&
          snappedVenueY >= hall.yFt &&
          snappedVenueY < hall.yFt + hall.heightFt
        ) {
          targetHall = hall;
          break;
        }
      }

      if (!targetHall) {
        // Clicked outside any hall, cancel placement
        setPlacingRow(null);
        return;
      }

      // Convert to hall-local coordinates
      const hallLocalX = snappedVenueX - targetHall.xFt;
      const hallLocalY = snappedVenueY - targetHall.yFt;

      const timestamp = Date.now();
      const newBooths: Booth[] = [];

      for (let i = 0; i < placingRow.numBooths; i++) {
        const boothNum = placingRow.startNum + i;
        const paddedNum = String(boothNum).padStart(2, "0");

        const xFt =
          placingRow.direction === "horizontal"
            ? hallLocalX + i * placingRow.boothWidth
            : hallLocalX;
        const yFt =
          placingRow.direction === "horizontal"
            ? hallLocalY
            : hallLocalY + i * placingRow.boothDepth;

        newBooths.push({
          id: `booth-NEW-${timestamp}-${i}`,
          number: `${placingRow.prefix}${paddedNum}`,
          hallId: targetHall.id,
          showId: activeShow.id,
          pavilionId: "",
          status: "available",
          boothType: "inline",
          xFt,
          yFt,
          widthFt: placingRow.boothWidth,
          heightFt: placingRow.boothDepth,
          price: placingRow.boothWidth * placingRow.boothDepth * 35,
        });
      }

      setBoothsWithHistory((prev) => [...prev, ...newBooths]);
      setPlacingRow(null);
    },
    [placingRow, position, scale, activeHalls, activeShow.id]
  );

  // Place a single booth at the clicked position
  const handlePlaceSingleBooth = useCallback(
    (pointerX: number, pointerY: number) => {
      if (!placingSingleBooth) return;

      // Convert screen pointer to venue feet
      const venueFtX = (pointerX - position.x) / scale / FT_TO_PX;
      const venueFtY = (pointerY - position.y) / scale / FT_TO_PX;

      // Snap to grid
      const snappedVenueX =
        Math.round(venueFtX / GRID_SPACING_FT) * GRID_SPACING_FT;
      const snappedVenueY =
        Math.round(venueFtY / GRID_SPACING_FT) * GRID_SPACING_FT;

      // Determine which hall was clicked
      let targetHall: Hall | null = null;
      for (const hall of activeHalls) {
        if (
          snappedVenueX >= hall.xFt &&
          snappedVenueX < hall.xFt + hall.widthFt &&
          snappedVenueY >= hall.yFt &&
          snappedVenueY < hall.yFt + hall.heightFt
        ) {
          targetHall = hall;
          break;
        }
      }

      if (!targetHall) {
        // Clicked outside any hall, cancel placement
        setPlacingSingleBooth(false);
        return;
      }

      // Convert to hall-local coordinates
      const hallLocalX = snappedVenueX - targetHall.xFt;
      const hallLocalY = snappedVenueY - targetHall.yFt;

      // Determine hall prefix from hall name
      const hallPrefix = targetHall.name.startsWith("East")
        ? "E"
        : targetHall.name.startsWith("West")
        ? "W"
        : targetHall.name.startsWith("North")
        ? "N"
        : targetHall.name.startsWith("South")
        ? "S"
        : targetHall.name.startsWith("Outdoor")
        ? "O"
        : "X";

      // Find the highest booth number with this prefix
      let maxNum = 99;
      for (const b of booths) {
        if (b.hallId === targetHall.id && b.number.startsWith(hallPrefix)) {
          const numPart = parseInt(b.number.slice(hallPrefix.length), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
      const nextNum = maxNum + 1;

      const boothWidth = 10;
      const boothDepth = 10;
      const timestamp = Date.now();
      const newBoothId = `booth-NEW-${timestamp}-single`;

      const newBooth: Booth = {
        id: newBoothId,
        number: `${hallPrefix}${nextNum}`,
        hallId: targetHall.id,
        showId: activeShow.id,
        pavilionId: "",
        status: "available",
        boothType: "inline",
        xFt: hallLocalX,
        yFt: hallLocalY,
        widthFt: boothWidth,
        heightFt: boothDepth,
        price: boothWidth * boothDepth * 35,
      };

      setBoothsWithHistory((prev) => [...prev, newBooth]);
      setSelectedIds(new Set([newBoothId]));
      setPlacingSingleBooth(false);
    },
    [placingSingleBooth, position, scale, activeHalls, activeShow.id, booths]
  );

  // Click empty space → deselect (or place row/booth if in placement mode)
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // If in row placement mode, place the row
      if (placingRow) {
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        handlePlaceRow(pointer.x, pointer.y);
        return;
      }

      // If in single booth placement mode, place the booth
      if (placingSingleBooth) {
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        handlePlaceSingleBooth(pointer.x, pointer.y);
        return;
      }

      // Only deselect if clicking the stage background itself
      if (e.target === stageRef.current || e.target.getClassName() === "Rect" && !e.target.getAttr("data-booth-id")) {
        setSelectedIds(new Set());
      }
    },
    [placingRow, handlePlaceRow, placingSingleBooth, handlePlaceSingleBooth]
  );

  // Click booth → select (shift+click → multi-select)
  const handleBoothClick = useCallback(
    (boothId: string, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        if (shiftKey) {
          const next = new Set(prev);
          if (next.has(boothId)) {
            next.delete(boothId);
          } else {
            next.add(boothId);
          }
          return next;
        }
        return new Set([boothId]);
      });
    },
    []
  );

  // Update a single booth
  const handleUpdateBooth = useCallback(
    (id: string, updates: Partial<Booth>) => {
      setBoothsWithHistory((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
    },
    [setBoothsWithHistory]
  );

  // Bulk update multiple booths
  const handleBulkUpdate = useCallback(
    (ids: string[], updates: Partial<Booth>) => {
      setBoothsWithHistory((prev) =>
        prev.map((b) => (ids.includes(b.id) ? { ...b, ...updates } : b))
      );
    },
    []
  );


  // --- Drag to Reposition Booths (Ticket 5) ---
  const [dragTooltip, setDragTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const dragStartRef = useRef<{
    boothId: string;
    startPositions: Map<string, { xFt: number; yFt: number }>;
    startPx: { x: number; y: number };
  } | null>(null);

  const handleBoothDragStart = useCallback(
    (boothId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const node = e.target;
      if (!selectedIds.has(boothId)) {
        setSelectedIds(new Set([boothId]));
      }
      const startPositions = new Map<string, { xFt: number; yFt: number }>();
      const idsToMove = selectedIds.has(boothId) ? Array.from(selectedIds) : [boothId];
      for (const id of idsToMove) {
        const b = booths.find((bb) => bb.id === id);
        if (b) startPositions.set(id, { xFt: b.xFt, yFt: b.yFt });
      }
      dragStartRef.current = {
        boothId,
        startPositions,
        startPx: { x: node.x(), y: node.y() },
      };
    },
    [selectedIds, booths]
  );

  const handleBoothDragMove = useCallback(
    (boothId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const node = e.target;
      const draggedBooth = booths.find((b) => b.id === boothId);
      if (!draggedBooth) return;
      const hall = hallMap.get(draggedBooth.hallId);
      if (!hall) return;
      const worldPxX = node.x();
      const worldPxY = node.y();
      const hallLocalXFt = worldPxX / FT_TO_PX - hall.xFt;
      const hallLocalYFt = worldPxY / FT_TO_PX - hall.yFt;
      const snappedX = Math.round(hallLocalXFt);
      const snappedY = Math.round(hallLocalYFt);
      const stage = stageRef.current;
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          setDragTooltip({
            x: pointer.x,
            y: pointer.y,
            text: 'x: ' + snappedX + 'ft, y: ' + snappedY + 'ft',
          });
        }
      }
    },
    [booths, hallMap]
  );

  const handleBoothDragEnd = useCallback(
    (boothId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      setDragTooltip(null);
      const ds = dragStartRef.current;
      if (!ds) return;
      const node = e.target;
      const newWorldPxX = node.x();
      const newWorldPxY = node.y();
      const deltaFt = {
        x: Math.round((newWorldPxX - ds.startPx.x) / FT_TO_PX),
        y: Math.round((newWorldPxY - ds.startPx.y) / FT_TO_PX),
      };
      node.x(ds.startPx.x);
      node.y(ds.startPx.y);
      setBoothsWithHistory((prev) =>
        prev.map((b) => {
          const startPos = ds.startPositions.get(b.id);
          if (!startPos) return b;
          return {
            ...b,
            xFt: startPos.xFt + deltaFt.x,
            yFt: startPos.yFt + deltaFt.y,
          };
        })
      );
      dragStartRef.current = null;
    },
    [booths, hallMap]
  );

  // --- Delete booth(s) ---
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{
    soldCount: number;
    totalCount: number;
    idsToDelete: string[];
  } | null>(null);

  const handleDeleteBooths = useCallback(() => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    const boothsToDelete = booths.filter((b) => selectedIds.has(b.id));
    const soldCount = boothsToDelete.filter((b) => b.status === "sold").length;

    if (soldCount > 0) {
      // Show confirmation dialog
      setDeleteConfirmInfo({
        soldCount,
        totalCount: boothsToDelete.length,
        idsToDelete,
      });
      setDeleteConfirmOpen(true);
    } else {
      // Delete immediately
      setBoothsWithHistory((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      setSelectedIds(new Set());
    }
  }, [selectedIds, booths, setBoothsWithHistory]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmInfo) {
      const idsSet = new Set(deleteConfirmInfo.idsToDelete);
      setBoothsWithHistory((prev) => prev.filter((b) => !idsSet.has(b.id)));
      setSelectedIds(new Set());
    }
    setDeleteConfirmOpen(false);
    setDeleteConfirmInfo(null);
  }, [deleteConfirmInfo]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmOpen(false);
    setDeleteConfirmInfo(null);
  }, []);

  // --- Auto-Number helpers ---

  // Detect direction: if booths span more horizontally, default to LTR; otherwise TTB
  const autoNumberDetectedDirection = useMemo((): "ltr" | "ttb" => {
    if (selectedBooths.length < 2) return "ltr";
    const xs = selectedBooths.map((b) => b.xFt);
    const ys = selectedBooths.map((b) => b.yFt);
    const xSpan = Math.max(...xs) - Math.min(...xs);
    const ySpan = Math.max(...ys) - Math.min(...ys);
    return xSpan >= ySpan ? "ltr" : "ttb";
  }, [selectedBooths]);

  // Derive default prefix from first selected booth
  const autoNumberDefaultPrefix = useMemo((): string => {
    if (selectedBooths.length === 0) return "";
    const num = selectedBooths[0].number;
    // Extract leading non-digit characters as prefix
    const match = num.match(/^([A-Za-z]*)/);
    return match ? match[1] : "";
  }, [selectedBooths]);

  // Generate preview: sorted booths with their new numbers
  const autoNumberPreview = useMemo(() => {
    if (selectedBooths.length === 0) return [];
    const sorted = [...selectedBooths].sort((a, b) => {
      if (autoNumberConfig.direction === "ltr") {
        return a.xFt !== b.xFt ? a.xFt - b.xFt : a.yFt - b.yFt;
      } else {
        return a.yFt !== b.yFt ? a.yFt - b.yFt : a.xFt - b.xFt;
      }
    });
    return sorted.map((booth, i) => ({
      id: booth.id,
      oldNumber: booth.number,
      newNumber: `${autoNumberConfig.prefix}${autoNumberConfig.startNum + i}`,
    }));
  }, [selectedBooths, autoNumberConfig]);

  const handleOpenAutoNumber = useCallback(() => {
    setAutoNumberConfig({
      prefix: autoNumberDefaultPrefix,
      startNum: 101,
      direction: autoNumberDetectedDirection,
    });
    setAutoNumberOpen(true);
  }, [autoNumberDefaultPrefix, autoNumberDetectedDirection]);

  const handleApplyAutoNumber = useCallback(() => {
    // Build update map from preview
    const updates: Array<{ id: string; number: string }> = [];
    const sorted = [...selectedBooths].sort((a, b) => {
      if (autoNumberConfig.direction === "ltr") {
        return a.xFt !== b.xFt ? a.xFt - b.xFt : a.yFt - b.yFt;
      } else {
        return a.yFt !== b.yFt ? a.yFt - b.yFt : a.xFt - b.xFt;
      }
    });
    sorted.forEach((booth, i) => {
      updates.push({
        id: booth.id,
        number: `${autoNumberConfig.prefix}${autoNumberConfig.startNum + i}`,
      });
    });
    setBoothsWithHistory((prev) =>
      prev.map((b) => {
        const upd = updates.find((u) => u.id === b.id);
        return upd ? { ...b, number: upd.number } : b;
      })
    );
    setAutoNumberOpen(false);
  }, [selectedBooths, autoNumberConfig]);

  // Delete key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" && selectedIds.size > 0) {
        // Don't trigger if user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        handleDeleteBooths();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDeleteBooths, selectedIds]);

  // Undo / Redo keyboard shortcuts
  useEffect(() => {
    function handleUndoRedoKey(e: KeyboardEvent) {
      // Don't trigger if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleUndoRedoKey);
    return () => window.removeEventListener("keydown", handleUndoRedoKey);
  }, [undo, redo]);

  // Escape key clears search
  useEffect(() => {
    function handleEscKey(e: KeyboardEvent) {
      if (e.key === "Escape" && searchActive) {
        handleClearSearch();
      }
    }
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [searchActive, handleClearSearch]);

  // --- Context Menu handlers ---

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setContextMenu(null);
    }
    function handleClick() {
      setContextMenu(null);
    }
    window.addEventListener("keydown", handleKey);
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClick);
    }, 0);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("click", handleClick);
      clearTimeout(timer);
    };
  }, [contextMenu]);

  const handleStageContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const venueFtX = (pointer.x - position.x) / scale / FT_TO_PX;
      const venueFtY = (pointer.y - position.y) / scale / FT_TO_PX;
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, boothId: null, venueFtX, venueFtY });
    },
    [position, scale]
  );

  const handleBoothContextMenu = useCallback(
    (boothId: string, e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      e.cancelBubble = true;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const venueFtX = (pointer.x - position.x) / scale / FT_TO_PX;
      const venueFtY = (pointer.y - position.y) / scale / FT_TO_PX;
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, boothId, venueFtX, venueFtY });
    },
    [position, scale]
  );

  const handleCtxEditProperties = useCallback(() => {
    if (contextMenu?.boothId) setSelectedIds(new Set([contextMenu.boothId]));
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleCtxDuplicate = useCallback(() => {
    if (!contextMenu?.boothId) return;
    const original = booths.find((b) => b.id === contextMenu.boothId);
    if (!original) return;
    const timestamp = Date.now();
    const newBooth: Booth = {
      ...original,
      id: `booth-NEW-${timestamp}-dup`,
      status: "available",
      exhibitorName: undefined,
      xFt: original.xFt + 10,
      price: original.widthFt * original.heightFt * 35,
    };
    const hall = hallMap.get(original.hallId);
    if (hall) {
      const hallPrefix = hall.name.startsWith("East") ? "E" : hall.name.startsWith("West") ? "W" : hall.name.startsWith("North") ? "N" : hall.name.startsWith("South") ? "S" : hall.name.startsWith("Outdoor") ? "O" : "X";
      let maxNum = 99;
      for (const b of booths) {
        if (b.hallId === original.hallId && b.number.startsWith(hallPrefix)) {
          const numPart = parseInt(b.number.slice(hallPrefix.length), 10);
          if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
        }
      }
      newBooth.number = `${hallPrefix}${maxNum + 1}`;
    }
    setBoothsWithHistory((prev) => [...prev, newBooth]);
    setSelectedIds(new Set([newBooth.id]));
    closeContextMenu();
  }, [contextMenu, booths, hallMap, closeContextMenu]);

  const handleCtxChangePavilion = useCallback(
    (pavilionId: string) => {
      if (!contextMenu?.boothId) return;
      handleUpdateBooth(contextMenu.boothId, { pavilionId });
      closeContextMenu();
    },
    [contextMenu, handleUpdateBooth, closeContextMenu]
  );

  const handleCtxSetStatus = useCallback(
    (status: BoothStatus) => {
      if (!contextMenu?.boothId) return;
      handleUpdateBooth(contextMenu.boothId, { status });
      closeContextMenu();
    },
    [contextMenu, handleUpdateBooth, closeContextMenu]
  );

  const handleCtxAutoNumber = useCallback(() => {
    if (contextMenu?.boothId) setSelectedIds(new Set([contextMenu.boothId]));
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleCtxDelete = useCallback(() => {
    if (!contextMenu?.boothId) return;
    setSelectedIds(new Set([contextMenu.boothId]));
    const boothToDelete = booths.find((b) => b.id === contextMenu.boothId);
    if (boothToDelete) {
      if (boothToDelete.status === "sold") {
        setDeleteConfirmInfo({ soldCount: 1, totalCount: 1, idsToDelete: [contextMenu.boothId] });
        setDeleteConfirmOpen(true);
      } else {
        setBoothsWithHistory((prev) => prev.filter((b) => b.id !== contextMenu.boothId));
        setSelectedIds(new Set());
      }
    }
    closeContextMenu();
  }, [contextMenu, booths, closeContextMenu]);

  const handleCtxAddBoothHere = useCallback(() => {
    if (!contextMenu) return;
    const snappedVenueX = Math.round(contextMenu.venueFtX / GRID_SPACING_FT) * GRID_SPACING_FT;
    const snappedVenueY = Math.round(contextMenu.venueFtY / GRID_SPACING_FT) * GRID_SPACING_FT;
    let targetHall: Hall | null = null;
    for (const hall of activeHalls) {
      if (snappedVenueX >= hall.xFt && snappedVenueX < hall.xFt + hall.widthFt && snappedVenueY >= hall.yFt && snappedVenueY < hall.yFt + hall.heightFt) {
        targetHall = hall;
        break;
      }
    }
    if (!targetHall) { closeContextMenu(); return; }
    const hallLocalX = snappedVenueX - targetHall.xFt;
    const hallLocalY = snappedVenueY - targetHall.yFt;
    const hallPrefix = targetHall.name.startsWith("East") ? "E" : targetHall.name.startsWith("West") ? "W" : targetHall.name.startsWith("North") ? "N" : targetHall.name.startsWith("South") ? "S" : targetHall.name.startsWith("Outdoor") ? "O" : "X";
    let maxNum = 99;
    for (const b of booths) {
      if (b.hallId === targetHall.id && b.number.startsWith(hallPrefix)) {
        const numPart = parseInt(b.number.slice(hallPrefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
      }
    }
    const timestamp = Date.now();
    const newBoothId = `booth-NEW-${timestamp}-ctx`;
    const newBooth: Booth = {
      id: newBoothId, number: `${hallPrefix}${maxNum + 1}`, hallId: targetHall.id, showId: activeShow.id,
      pavilionId: "", status: "available", boothType: "inline",
      xFt: hallLocalX, yFt: hallLocalY, widthFt: 10, heightFt: 10, price: 10 * 10 * 35,
    };
    setBoothsWithHistory((prev) => [...prev, newBooth]);
    setSelectedIds(new Set([newBoothId]));
    closeContextMenu();
  }, [contextMenu, activeHalls, booths, activeShow.id, closeContextMenu, setBoothsWithHistory]);

  const handleCtxAddRowHere = useCallback(() => {
    setRowGeneratorOpen(true);
    closeContextMenu();
  }, [closeContextMenu]);

  // --- Resize handle callbacks ---

  const handleResizeDragStart = useCallback(
    (
      boothId: string,
      corner: "tl" | "tr" | "bl" | "br",
      booth: Booth,
      hall: Hall
    ) => {
      // The anchor is the opposite corner (stays fixed during resize)
      const anchorXFt =
        corner === "tl" || corner === "bl"
          ? booth.xFt + booth.widthFt
          : booth.xFt;
      const anchorYFt =
        corner === "tl" || corner === "tr"
          ? booth.yFt + booth.heightFt
          : booth.yFt;
      resizingRef.current = {
        boothId,
        corner,
        anchorXFt,
        anchorYFt,
        hallXFt: hall.xFt,
        hallYFt: hall.yFt,
      };
      setIsResizing(true);
    },
    []
  );

  const handleResizeDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      const r = resizingRef.current;
      if (!r) return;

      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Convert screen pointer to world px, then to hall-local feet
      const worldXPx = (pointer.x - position.x) / scale;
      const worldYPx = (pointer.y - position.y) / scale;
      const draggedXFt = worldXPx / FT_TO_PX - r.hallXFt;
      const draggedYFt = worldYPx / FT_TO_PX - r.hallYFt;

      // Compute new bounds from anchor and dragged corner
      let newXFt = Math.round(Math.min(r.anchorXFt, draggedXFt));
      let newYFt = Math.round(Math.min(r.anchorYFt, draggedYFt));
      let newWFt = Math.round(Math.abs(r.anchorXFt - draggedXFt));
      let newHFt = Math.round(Math.abs(r.anchorYFt - draggedYFt));

      // Enforce minimum size, pinning to anchor side
      if (newWFt < MIN_BOOTH_SIZE_FT) {
        newWFt = MIN_BOOTH_SIZE_FT;
        if (draggedXFt < r.anchorXFt) {
          newXFt = r.anchorXFt - MIN_BOOTH_SIZE_FT;
        } else {
          newXFt = r.anchorXFt;
        }
      }
      if (newHFt < MIN_BOOTH_SIZE_FT) {
        newHFt = MIN_BOOTH_SIZE_FT;
        if (draggedYFt < r.anchorYFt) {
          newYFt = r.anchorYFt - MIN_BOOTH_SIZE_FT;
        } else {
          newYFt = r.anchorYFt;
        }
      }

      handleUpdateBooth(r.boothId, {
        xFt: newXFt,
        yFt: newYFt,
        widthFt: newWFt,
        heightFt: newHFt,
      });

      setResizeTooltip({
        x: pointer.x,
        y: pointer.y,
        text: `${newWFt}\u00d7${newHFt} ft`,
      });
    },
    [scale, position, handleUpdateBooth]
  );

  const handleResizeDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      resizingRef.current = null;
      setIsResizing(false);
      setResizeTooltip(null);
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // --- Clone From handler (Ticket 15) ---
  const handleCloneConfirm = useCallback(() => {
    if (!cloneConfirmShow) return;
    const source = cloneableShows.find((cs) => cs.show.id === cloneConfirmShow);
    if (!source) return;

    const clonedBooths: Booth[] = source.booths.map((b) => ({
      ...b,
      id: `clone-${b.id}`,
      showId: activeShow.id,
      status: "available" as const,
      exhibitorName: undefined,
      notes: undefined,
    }));

    setBoothsWithHistory(clonedBooths);
    setSelectedIds(new Set());
    setCloneModalOpen(false);
    setCloneConfirmShow(null);

    const msg = `Cloned ${clonedBooths.length} booths from ${source.show.name}. All exhibitor assignments cleared.`;
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  }, [cloneConfirmShow, activeShow.id, setBoothsWithHistory]);

  const showGrid = scale >= GRID_VISIBLE_SCALE;
  const showLabels = scale >= 0.25;
  const showExhibitorNames = scale >= 0.6;

  // Adjust canvas width when panel is open
  const canvasWidth = panelOpen
    ? Math.max(stageSize.width - PANEL_WIDTH, 400)
    : stageSize.width;

  return (
    <div style={{ width: "100vw", height: "100vh", background: CANVAS_BG }}>
      {/* Toolbar */}
      <div
        style={{
          height: TOOLBAR_HEIGHT,
          background: TOOLBAR_BG,
          display: "flex",
          flexDirection: "column",
          borderBottom: `1px solid ${TOOLBAR_BORDER}`,
          fontFamily: "system-ui, sans-serif",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          position: "relative",
          zIndex: 5,
        }}
        data-testid="toolbar"
      >
        {/* Row 1: Show name, venue, toggle, zoom info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            height: 48,
            minHeight: 48,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <span style={{ color: "#2D2A26", fontSize: 18, fontWeight: 700 }}>
                {activeShow.name}
              </span>
              <span style={{ color: "#8C8C8C", fontSize: 12, fontWeight: 400 }}>
                Tucson Expo Center
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => {
                setPlacingSingleBooth(true);
                setPlacingRow(null);
                setRowGeneratorOpen(false);
              }}
              style={{
                background: placingSingleBooth ? "#1D4ED8" : SELECTION_ACCENT,
                border: `1px solid ${placingSingleBooth ? "#1D4ED8" : SELECTION_ACCENT}`,
                borderRadius: 6,
                color: "#FFFFFF",
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
              data-testid="add-booth-btn"
            >
              + Add Booth
            </button>
            {placingSingleBooth && (
              <span
                style={{
                  fontSize: 11,
                  color: "#3B82F6",
                  fontStyle: "italic",
                }}
              >
                Click on canvas to place booth
                <button
                  onClick={() => setPlacingSingleBooth(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 11,
                    marginLeft: 8,
                    padding: 0,
                    textDecoration: "underline",
                  }}
                  data-testid="cancel-single-booth-btn"
                >
                  Cancel
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setRowGeneratorOpen(true);
                setPlacingRow(null);
                setPlacingSingleBooth(false);
              }}
              style={{
                background: placingRow ? "#3B82F6" : "#F0EDE6",
                border: `1px solid ${placingRow ? "#3B82F6" : "#D6D1C8"}`,
                borderRadius: 4,
                color: "#2D2A26",
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              data-testid="add-booth-row-btn"
            >
              + Add Booth Row
            </button>
            {placingRow && (
              <span
                style={{
                  fontSize: 11,
                  color: "#3B82F6",
                  fontStyle: "italic",
                }}
              >
                Click on canvas to place row
                <button
                  onClick={() => setPlacingRow(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 11,
                    marginLeft: 8,
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  Cancel
                </button>
              </span>
            )}
            {selectedIds.size >= 2 && (
              <button
                onClick={handleOpenAutoNumber}
                style={{
                  background: "#F0EDE6",
                  border: "1px solid #D6D1C8",
                  borderRadius: 4,
                  color: "#2D2A26",
                  padding: "4px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                data-testid="auto-number-btn"
              >
                Auto-Number
              </button>
            )}
            {/* Search bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                position: "relative",
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search booth # or exhibitor..."
                style={{
                  background: "#F0EDE6",
                  border: `1px solid ${searchActive ? "#3B82F6" : "#D6D1C8"}`,
                  borderRadius: 4,
                  color: "#2D2A26",
                  padding: "4px 28px 4px 10px",
                  fontSize: 12,
                  width: 220,
                  outline: "none",
                }}
                data-testid="search-input"
              />
              {searchActive && (
                <button
                  onClick={handleClearSearch}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#888",
                    fontSize: 14,
                    cursor: "pointer",
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                  data-testid="search-clear"
                >
                  x
                </button>
              )}
            </div>
            {searchActive && (
              <span
                style={{
                  fontSize: 11,
                  color: searchMatchIds.size > 0 ? "#3EAE6A" : "#dc2626",
                  whiteSpace: "nowrap",
                }}
                data-testid="search-result-count"
              >
                {searchMatchIds.size > 0
                  ? `${searchMatchIds.size} match${searchMatchIds.size !== 1 ? "es" : ""}`
                  : "No matches"}
              </span>
            )}
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                background: "#F0EDE6",
                border: "1px solid #D6D1C8",
                borderRadius: 4,
                color: canUndo ? "#2D2A26" : "#555",
                padding: "4px 12px",
                fontSize: 12,
                cursor: canUndo ? "pointer" : "default",
                whiteSpace: "nowrap",
                opacity: canUndo ? 1 : 0.5,
              }}
              data-testid="undo-btn"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              style={{
                background: "#F0EDE6",
                border: "1px solid #D6D1C8",
                borderRadius: 4,
                color: canRedo ? "#2D2A26" : "#555",
                padding: "4px 12px",
                fontSize: 12,
                cursor: canRedo ? "pointer" : "default",
                whiteSpace: "nowrap",
                opacity: canRedo ? 1 : 0.5,
              }}
              data-testid="redo-btn"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
            <div
              data-testid="color-mode-toggle"
              style={{
                display: "inline-flex",
                border: "1px solid #D6D1C8",
                borderRadius: 6,
                overflow: "hidden",
                fontSize: 12,
              }}
            >
              <button
                onClick={() => setColorMode("pavilion")}
                style={{
                  background: colorMode === "pavilion" ? SELECTION_ACCENT : "#FFFFFF",
                  color: colorMode === "pavilion" ? "#FFFFFF" : "#6B6B6B",
                  border: "none",
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontWeight: colorMode === "pavilion" ? 600 : 400,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                Pavilion View
              </button>
              <button
                onClick={() => setColorMode("status")}
                style={{
                  background: colorMode === "status" ? SELECTION_ACCENT : "#FFFFFF",
                  color: colorMode === "status" ? "#FFFFFF" : "#6B6B6B",
                  border: "none",
                  borderLeft: "1px solid #D6D1C8",
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontWeight: colorMode === "status" ? 600 : 400,
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                Status View
              </button>
            </div>
            <button
              onClick={() => setCloneModalOpen(true)}
              style={{
                background: "#F0EDE6",
                border: "1px solid #D6D1C8",
                borderRadius: 4,
                color: "#2D2A26",
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              data-testid="clone-from-btn"
            >
              Clone From
            </button>
            <span
              style={{ color: "#8C8C8C", fontSize: 12, fontFamily: "monospace" }}
            >
              {Math.round(scale * 100)}%
              {selectedIds.size > 0 && ` | ${selectedIds.size} selected`}
            </span>
          </div>
        </div>

        {/* Row 2: Legend + Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            height: 48,
            minHeight: 48,
            borderTop: `1px solid ${TOOLBAR_BORDER}`,
            background: "#FAFAF7",
          }}
        >
          {/* Legend */}
          <div
            style={{ display: "flex", gap: 14, alignItems: "center" }}
            data-testid="legend"
          >
            {colorMode === "pavilion"
              ? <>
                  {mockData.pavilions.map((p) => {
                    const isActive = activePavilionFilters.has(p.id);
                    return (
                      <span
                        key={p.id}
                        data-testid={`pavilion-filter-${p.id}`}
                        onClick={() => {
                          setActivePavilionFilters((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) {
                              next.delete(p.id);
                            } else {
                              next.add(p.id);
                            }
                            return next;
                          });
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0,
                          fontSize: 11,
                          fontWeight: 500,
                          color: isActive ? getAutoContrastText(p.color) : getAutoContrastText(p.color),
                          cursor: "pointer",
                          padding: "3px 10px",
                          borderRadius: 12,
                          border: isActive ? `2px solid ${darkenColor(p.color, 0.2)}` : "2px solid transparent",
                          background: isActive ? p.color : `${p.color}88`,
                          userSelect: "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {p.name}
                      </span>
                    );
                  })}
                  {pavilionFilterActive && (
                    <span
                      data-testid="show-all-btn"
                      onClick={() => setActivePavilionFilters(new Set())}
                      style={{
                        fontSize: 11,
                        color: "#2563EB",
                        cursor: "pointer",
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: "1px solid #2563EB",
                        userSelect: "none",
                        marginLeft: 4,
                      }}
                    >
                      Show All
                    </span>
                  )}
                </>
              : (
                  Object.entries(STATUS_COLORS) as [string, string][]
                ).map(([status, color]) => (
                  <span
                    key={status}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: 11,
                      fontWeight: 500,
                      color: getAutoContrastText(color),
                      textTransform: "capitalize",
                      padding: "3px 10px",
                      borderRadius: 12,
                      background: color,
                    }}
                  >
                    {status}
                  </span>
                ))}
          </div>

          {/* Stats */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, fontFamily: "system-ui, sans-serif" }}
            data-testid="booth-stats"
          >
            <span style={{ color: "#6B6B6B", fontWeight: 600 }}>{boothStats.total} booths</span>
            <span style={{ color: STATUS_COLORS.sold, fontWeight: 600 }}>{boothStats.sold} sold</span>
            <span style={{ color: STATUS_COLORS.available, fontWeight: 600 }}>{boothStats.available} avail</span>
            <span style={{ color: STATUS_COLORS.held, fontWeight: 600 }}>{boothStats.held} held</span>
            <span style={{ color: STATUS_COLORS.blocked, fontWeight: 600 }}>{boothStats.blocked} blocked</span>
          </div>
        </div>
      </div>

      {/* Row Generator Modal */}
      {rowGeneratorOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRowGeneratorOpen(false);
          }}
          data-testid="row-generator-modal"
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #D6D1C8",
              borderRadius: 8,
              padding: 24,
              width: 360,
              fontFamily: "system-ui, sans-serif",
              color: "#2D2A26",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Add Booth Row
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Number of booths */}
              <RowGenField label="Number of booths">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={rowConfig.numBooths}
                  onChange={(e) =>
                    setRowConfig((c) => ({
                      ...c,
                      numBooths: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  style={rowGenInputStyle}
                  data-testid="rowgen-num-booths"
                />
              </RowGenField>

              {/* Booth width */}
              <RowGenField label="Booth width (ft)">
                <input
                  type="number"
                  min={MIN_BOOTH_SIZE_FT}
                  max={200}
                  value={rowConfig.boothWidth}
                  onChange={(e) =>
                    setRowConfig((c) => ({
                      ...c,
                      boothWidth: Math.max(
                        MIN_BOOTH_SIZE_FT,
                        parseInt(e.target.value) || MIN_BOOTH_SIZE_FT
                      ),
                    }))
                  }
                  style={rowGenInputStyle}
                  data-testid="rowgen-booth-width"
                />
              </RowGenField>

              {/* Booth depth */}
              <RowGenField label="Booth depth (ft)">
                <input
                  type="number"
                  min={MIN_BOOTH_SIZE_FT}
                  max={200}
                  value={rowConfig.boothDepth}
                  onChange={(e) =>
                    setRowConfig((c) => ({
                      ...c,
                      boothDepth: Math.max(
                        MIN_BOOTH_SIZE_FT,
                        parseInt(e.target.value) || MIN_BOOTH_SIZE_FT
                      ),
                    }))
                  }
                  style={rowGenInputStyle}
                  data-testid="rowgen-booth-depth"
                />
              </RowGenField>

              {/* Aisle gap */}
              <RowGenField label="Aisle gap after row (ft)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rowConfig.aisleGap}
                  onChange={(e) =>
                    setRowConfig((c) => ({
                      ...c,
                      aisleGap: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  style={rowGenInputStyle}
                  data-testid="rowgen-aisle-gap"
                />
              </RowGenField>

              {/* Prefix + Starting number row */}
              <div style={{ display: "flex", gap: 12 }}>
                <RowGenField label="Number prefix" style={{ flex: 1 }}>
                  <input
                    type="text"
                    maxLength={4}
                    value={rowConfig.prefix}
                    onChange={(e) =>
                      setRowConfig((c) => ({ ...c, prefix: e.target.value }))
                    }
                    style={rowGenInputStyle}
                    data-testid="rowgen-prefix"
                  />
                </RowGenField>
                <RowGenField label="Starting number" style={{ flex: 1 }}>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={rowConfig.startNum}
                    onChange={(e) =>
                      setRowConfig((c) => ({
                        ...c,
                        startNum: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    style={rowGenInputStyle}
                    data-testid="rowgen-start-num"
                  />
                </RowGenField>
              </div>

              {/* Direction */}
              <RowGenField label="Direction">
                <select
                  value={rowConfig.direction}
                  onChange={(e) =>
                    setRowConfig((c) => ({
                      ...c,
                      direction: e.target.value as "horizontal" | "vertical",
                    }))
                  }
                  style={rowGenInputStyle}
                  data-testid="rowgen-direction"
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </RowGenField>

              {/* Preview text */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "#F0EDE6",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#aaa",
                  fontFamily: "monospace",
                }}
              >
                Preview: {rowConfig.prefix}
                {String(rowConfig.startNum).padStart(2, "0")} &ndash;{" "}
                {rowConfig.prefix}
                {String(rowConfig.startNum + rowConfig.numBooths - 1).padStart(
                  2,
                  "0"
                )}{" "}
                ({rowConfig.numBooths} booths, {rowConfig.boothWidth}&times;
                {rowConfig.boothDepth} ft each)
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 4,
                }}
              >
                <button
                  onClick={() => setRowGeneratorOpen(false)}
                  style={{
                    background: "#F0EDE6",
                    border: "1px solid #D6D1C8",
                    borderRadius: 4,
                    color: "#2D2A26",
                    padding: "6px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  data-testid="rowgen-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setPlacingRow({ ...rowConfig });
                    setRowGeneratorOpen(false);
                  }}
                  style={{
                    background: "#3B82F6",
                    border: "1px solid #3B82F6",
                    borderRadius: 4,
                    color: "#ffffff",
                    padding: "6px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  data-testid="rowgen-place"
                >
                  Place Row
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && deleteConfirmInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelDelete();
          }}
          data-testid="delete-confirm-modal"
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #D6D1C8",
              borderRadius: 8,
              padding: 24,
              width: 360,
              fontFamily: "system-ui, sans-serif",
              color: "#2D2A26",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Confirm Delete
            </h3>

            <p style={{ margin: "0 0 20px 0", fontSize: 14, lineHeight: 1.5 }}>
              {deleteConfirmInfo.soldCount} of {deleteConfirmInfo.totalCount} selected booth
              {deleteConfirmInfo.totalCount !== 1 ? "s" : ""}{" "}
              {deleteConfirmInfo.soldCount !== 1 ? "are" : "is"} sold. Delete anyway?
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancelDelete}
                style={{
                  background: "#F0EDE6",
                  border: "1px solid #D6D1C8",
                  borderRadius: 4,
                  color: "#2D2A26",
                  padding: "6px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
                data-testid="delete-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  background: "#dc2626",
                  border: "1px solid #dc2626",
                  borderRadius: 4,
                  color: "#ffffff",
                  padding: "6px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                data-testid="delete-confirm-btn"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Number Modal */}
      {autoNumberOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAutoNumberOpen(false);
          }}
          data-testid="auto-number-modal"
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #D6D1C8",
              borderRadius: 8,
              padding: 24,
              width: 400,
              fontFamily: "system-ui, sans-serif",
              color: "#2D2A26",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Auto-Number {selectedBooths.length} Booths
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Prefix + Start number row */}
              <div style={{ display: "flex", gap: 12 }}>
                <RowGenField label="Prefix" style={{ flex: 1 }}>
                  <input
                    type="text"
                    maxLength={4}
                    value={autoNumberConfig.prefix}
                    onChange={(e) =>
                      setAutoNumberConfig((c) => ({ ...c, prefix: e.target.value }))
                    }
                    style={rowGenInputStyle}
                    data-testid="auto-number-prefix"
                  />
                </RowGenField>
                <RowGenField label="Start number" style={{ flex: 1 }}>
                  <input
                    type="number"
                    min={1}
                    max={99999}
                    value={autoNumberConfig.startNum}
                    onChange={(e) =>
                      setAutoNumberConfig((c) => ({
                        ...c,
                        startNum: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    style={rowGenInputStyle}
                    data-testid="auto-number-start"
                  />
                </RowGenField>
              </div>

              {/* Direction */}
              <RowGenField label="Direction">
                <select
                  value={autoNumberConfig.direction}
                  onChange={(e) =>
                    setAutoNumberConfig((c) => ({
                      ...c,
                      direction: e.target.value as "ltr" | "ttb",
                    }))
                  }
                  style={rowGenInputStyle}
                  data-testid="auto-number-direction"
                >
                  <option value="ltr">Left to Right</option>
                  <option value="ttb">Top to Bottom</option>
                </select>
              </RowGenField>

              {/* Preview */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "#F0EDE6",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#aaa",
                  fontFamily: "monospace",
                  maxHeight: 160,
                  overflowY: "auto",
                }}
                data-testid="auto-number-preview"
              >
                {autoNumberPreview.map((item) => (
                  <div key={item.id} style={{ padding: "2px 0" }}>
                    {item.oldNumber} &rarr; {item.newNumber}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 4,
                }}
              >
                <button
                  onClick={() => setAutoNumberOpen(false)}
                  style={{
                    background: "#F0EDE6",
                    border: "1px solid #D6D1C8",
                    borderRadius: 4,
                    color: "#2D2A26",
                    padding: "6px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  data-testid="auto-number-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyAutoNumber}
                  style={{
                    background: "#3B82F6",
                    border: "1px solid #3B82F6",
                    borderRadius: 4,
                    color: "#ffffff",
                    padding: "6px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  data-testid="auto-number-apply"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clone From Modal (Ticket 15) */}
      {cloneModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCloneModalOpen(false);
              setCloneConfirmShow(null);
            }
          }}
          data-testid="clone-modal"
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #D6D1C8",
              borderRadius: 8,
              padding: 24,
              width: 400,
              fontFamily: "system-ui, sans-serif",
              color: "#2D2A26",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>
              Clone Floor Plan From Show
            </h3>
            <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 16px 0" }}>
              Select a show to clone its floor plan. All pavilions and booth
              positions will be copied. Exhibitor assignments will be cleared.
            </p>
            <select
              value={cloneConfirmShow || ""}
              onChange={(e) => setCloneConfirmShow(e.target.value || null)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#F0EDE6",
                border: "1px solid #D6D1C8",
                borderRadius: 4,
                color: "#2D2A26",
                fontSize: 13,
                marginBottom: 16,
              }}
              data-testid="clone-show-select"
            >
              <option value="">-- Select a show --</option>
              {cloneableShows.map((cs) => (
                <option key={cs.show.id} value={cs.show.id}>
                  {cs.show.name} ({cs.booths.length} booths)
                </option>
              ))}
            </select>

            {cloneConfirmShow && (
              <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 12px 0" }}>
                This will replace all current booths. Continue?
              </p>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setCloneModalOpen(false);
                  setCloneConfirmShow(null);
                }}
                style={{
                  background: "#F0EDE6",
                  border: "1px solid #D6D1C8",
                  borderRadius: 4,
                  color: "#2D2A26",
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
                data-testid="clone-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleCloneConfirm}
                disabled={!cloneConfirmShow}
                style={{
                  background: cloneConfirmShow ? "#3B82F6" : "#333",
                  border: "1px solid " + (cloneConfirmShow ? "#3B82F6" : "#555"),
                  borderRadius: 4,
                  color: cloneConfirmShow ? "#fff" : "#888",
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: cloneConfirmShow ? "pointer" : "not-allowed",
                }}
                data-testid="clone-confirm-btn"
              >
                Clone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Toast (Ticket 15) */}
      {toastVisible && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2D6CCB",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 500,
            zIndex: 200,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            animation: "fadeIn 0.3s ease-in",
          }}
          data-testid="clone-toast"
        >
          {toastMessage}
        </div>
      )}

      {/* Canvas + Panel container */}
      <div style={{ position: "relative", width: "100%", height: `calc(100vh - ${TOOLBAR_HEIGHT}px)` }}>
        {/* Canvas */}
        <Stage
          ref={stageRef}
          width={canvasWidth}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          onClick={handleStageClick}
          onContextMenu={handleStageContextMenu}
        >
          {/* Background layer */}
          <Layer listening={false}>
            <Rect
              x={0}
              y={0}
              width={VENUE_WIDTH_PX}
              height={VENUE_HEIGHT_PX}
              fill={AISLE_COLOR}
              stroke={HALL_STROKE}
              strokeWidth={1.5 / scale}
              cornerRadius={6 / scale}
              shadowColor="rgba(0,0,0,0.1)"
              shadowBlur={8 / scale}
              shadowOffsetY={3 / scale}
            />
            {activeHalls.map((hall) => (
              <Group key={hall.id}>
                <Rect
                  x={hall.xFt * FT_TO_PX}
                  y={hall.yFt * FT_TO_PX}
                  width={hall.widthFt * FT_TO_PX}
                  height={hall.heightFt * FT_TO_PX}
                  fill={hall.indoor ? HALL_FILL_INDOOR : HALL_FILL_OUTDOOR}
                  stroke={HALL_STROKE}
                  strokeWidth={1.5 / scale}
                  cornerRadius={4 / scale}
                  shadowColor="rgba(0,0,0,0.12)"
                  shadowBlur={6 / scale}
                  shadowOffsetY={2 / scale}
                  shadowOffsetX={0}
                />
                <Text
                  x={hall.xFt * FT_TO_PX + 10}
                  y={hall.yFt * FT_TO_PX + 8}
                  text={hall.name}
                  fontSize={Math.min(24, 16 / scale)}
                  fill="#8C8C8C"
                  fontFamily="system-ui, sans-serif"
                  fontStyle="bold"
                />
              </Group>
            ))}
          </Layer>

          {/* Grid layer */}
          {showGrid && (
            <Layer listening={false}>
              <GridLines
                width={VENUE_WIDTH_PX}
                height={VENUE_HEIGHT_PX}
                spacing={GRID_SPACING_PX}
                scale={scale}
              />
            </Layer>
          )}

          {/* Booth layer */}
          <Layer>
            {activeBooths.map((booth) => {
              const hall = hallMap.get(booth.hallId);
              if (!hall) return null;

              const bx = (hall.xFt + booth.xFt) * FT_TO_PX;
              const by = (hall.yFt + booth.yFt) * FT_TO_PX;
              const bw = booth.widthFt * FT_TO_PX;
              const bh = booth.heightFt * FT_TO_PX;

              const fill = getBoothFill(booth, pavilionMap, colorMode);
              const baseOpacity = getBoothOpacity(booth);
              const isHeld = booth.status === "held";
              const isBlocked = booth.status === "blocked";
              const isAvailable = booth.status === "available";
              const isSelected = selectedIds.has(booth.id);
              const borderInfo = getBoothBorder(booth, fill);
              const textColor = getAutoContrastText(fill);

              // Search highlight/dim logic
              const isSearchMatch = searchActive && searchMatchIds.has(booth.id);
              const isSearchDimmed = searchActive && !searchMatchIds.has(booth.id);

              // Pavilion filter dim logic
              const isPavilionFiltered = pavilionFilterActive && !activePavilionFilters.has(booth.pavilionId);

              const opacity = isSearchDimmed ? 0.3 : isPavilionFiltered ? 0.2 : baseOpacity;

              // Pulsing glow intensity for search matches (oscillates between 0.4 and 1.0)
              const glowIntensity = 0.7 + 0.3 * Math.sin(glowPhase);
              const glowStrokeWidth = (4 + 2 * Math.sin(glowPhase)) / scale;

              return (
                <Group
                  key={booth.id}
                  x={bx}
                  y={by}
                  draggable
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleBoothClick(booth.id, e.evt.shiftKey);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    handleBoothClick(booth.id, false);
                  }}
                  onDragStart={(e) => {
                    handleBoothDragStart(booth.id, e);
                  }}
                  onDragMove={(e) => {
                    handleBoothDragMove(booth.id, e);
                  }}
                  onDragEnd={(e) => {
                    handleBoothDragEnd(booth.id, e);
                  }}
                  onContextMenu={(e) => {
                    handleBoothContextMenu(booth.id, e);
                  }}
                >
                  {/* Search match glow ring (rendered behind everything) */}
                  {isSearchMatch && (
                    <Rect
                      x={-5 / scale}
                      y={-5 / scale}
                      width={bw + 10 / scale}
                      height={bh + 10 / scale}
                      stroke={`rgba(59, 130, 246, ${glowIntensity})`}
                      strokeWidth={glowStrokeWidth}
                      cornerRadius={4 / scale}
                      listening={false}
                      shadowColor="#3B82F6"
                      shadowBlur={12 / scale}
                      shadowOpacity={glowIntensity * 0.8}
                    />
                  )}

                  {/* Selection highlight (rendered behind the booth) */}
                  {isSelected && !isSearchMatch && (
                    <Rect
                      x={-3 / scale}
                      y={-3 / scale}
                      width={bw + 6 / scale}
                      height={bh + 6 / scale}
                      stroke={SELECTION_ACCENT}
                      strokeWidth={2 / scale}
                      cornerRadius={3 / scale}
                      listening={false}
                      shadowColor={SELECTION_ACCENT}
                      shadowBlur={8 / scale}
                      shadowOpacity={0.4}
                    />
                  )}

                  {/* Booth rectangle */}
                  <Rect
                    x={0}
                    y={0}
                    width={bw}
                    height={bh}
                    fill={fill}
                    opacity={opacity}
                    stroke={borderInfo.stroke}
                    strokeWidth={borderInfo.strokeWidth / scale}
                    dash={borderInfo.dash ? borderInfo.dash.map(d => d / scale) : undefined}
                    cornerRadius={BOOTH_CORNER_RADIUS / scale}
                  />

                  {/* Held booth: diagonal stripe overlay */}
                  {isHeld && (() => {
                    const stripeLines: React.ReactElement[] = [];
                    const stripeSpacing = 8 / scale;
                    const totalDiag = bw + bh;
                    for (let d = stripeSpacing; d < totalDiag; d += stripeSpacing) {
                      const x1 = Math.min(d, bw);
                      const y1 = d - x1;
                      const y2 = Math.min(d, bh);
                      const x2 = d - y2;
                      stripeLines.push(
                        <Line
                          key={`stripe-${d}`}
                          points={[x2, y2, x1, y1]}
                          stroke="rgba(255,255,255,0.35)"
                          strokeWidth={1.5 / scale}
                          listening={false}
                        />
                      );
                    }
                    return <>{stripeLines}</>;
                  })()}

                  {/* Blocked booth: "X" pattern */}
                  {isBlocked && (
                    <>
                      <Line
                        points={[2/scale, 2/scale, bw - 2/scale, bh - 2/scale]}
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth={1.5 / scale}
                        listening={false}
                      />
                      <Line
                        points={[bw - 2/scale, 2/scale, 2/scale, bh - 2/scale]}
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth={1.5 / scale}
                        listening={false}
                      />
                    </>
                  )}

                  {/* Booth number */}
                  {showLabels && (
                    <Text
                      x={0}
                      y={bh / 2 - (showExhibitorNames ? 8 : 5)}
                      width={bw}
                      align="center"
                      text={booth.number}
                      fontSize={Math.min(14, 10 / Math.max(scale, 0.3))}
                      fill={textColor}
                      fontFamily="system-ui, sans-serif"
                      fontStyle="bold"
                      listening={false}
                    />
                  )}

                  {/* Exhibitor name (only at higher zoom) */}
                  {showExhibitorNames && booth.exhibitorName && (
                    <Text
                      x={2}
                      y={bh / 2 + 4}
                      width={bw - 4}
                      align="center"
                      text={booth.exhibitorName}
                      fontSize={Math.min(9, 7 / Math.max(scale, 0.5))}
                      fill={textColor}
                      fontFamily="system-ui, sans-serif"
                      wrap="none"
                      ellipsis={true}
                      listening={false}
                      opacity={0.75}
                    />
                  )}

                  {/* Resize handles at corners (only when selected) */}
                  {isSelected &&
                    (
                      [
                        { key: "tl" as const, cx: 0, cy: 0, cursor: "nwse-resize" },
                        { key: "tr" as const, cx: bw, cy: 0, cursor: "nesw-resize" },
                        { key: "bl" as const, cx: 0, cy: bh, cursor: "nesw-resize" },
                        { key: "br" as const, cx: bw, cy: bh, cursor: "nwse-resize" },
                      ] as const
                    ).map((h) => {
                      const hs = HANDLE_SIZE / scale; // scale-independent visual size
                      return (
                        <Rect
                          key={h.key}
                          x={h.cx - hs / 2}
                          y={h.cy - hs / 2}
                          width={hs}
                          height={hs}
                          fill="#ffffff"
                          stroke={SELECTION_COLOR}
                          strokeWidth={1.5 / scale}
                          draggable
                          onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = h.cursor;
                          }}
                          onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = "default";
                          }}
                          onClick={(e) => {
                            e.cancelBubble = true;
                          }}
                          onDragStart={(e) => {
                            e.cancelBubble = true;
                            handleResizeDragStart(booth.id, h.key, booth, hall!);
                          }}
                          onDragMove={(e) => {
                            handleResizeDragMove(e);
                          }}
                          onDragEnd={(e) => {
                            handleResizeDragEnd(e);
                          }}
                        />
                      );
                    })}
                </Group>
              );
            })}
          </Layer>
        </Stage>

        {/* Resize dimension tooltip */}
        {isResizing && resizeTooltip && (
          <div
            style={{
              position: "absolute",
              left: resizeTooltip.x + 16,
              top: resizeTooltip.y - 12,
              background: "#FFFFFF",
              border: "1px solid #3B82F6",
              borderRadius: 4,
              padding: "3px 8px",
              color: "#2D2A26",
              fontSize: 12,
              fontFamily: "monospace",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 20,
            }}
          >
            {resizeTooltip.text}
          </div>
        )}

        {/* Drag coordinate tooltip (Ticket 5) */}
        {dragTooltip && (
          <div
            style={{
              position: 'absolute',
              left: dragTooltip.x + 16,
              top: dragTooltip.y - 28,
              background: '#FFFFFF',
              border: '1px solid #3EAE6A',
              borderRadius: 4,
              padding: '3px 8px',
              color: '#3EAE6A',
              fontSize: 12,
              fontFamily: 'monospace',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 20,
            }}
          >
            {dragTooltip.text}
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenuOverlay
            x={contextMenu.x}
            y={contextMenu.y}
            boothId={contextMenu.boothId}
            pavilions={mockData.pavilions}
            onEditProperties={handleCtxEditProperties}
            onDuplicate={handleCtxDuplicate}
            onChangePavilion={handleCtxChangePavilion}
            onSetStatus={handleCtxSetStatus}
            onAutoNumber={handleCtxAutoNumber}
            onDelete={handleCtxDelete}
            onAddBoothHere={handleCtxAddBoothHere}
            onAddRowHere={handleCtxAddRowHere}
          />
        )}

        {/* Properties Panel */}
        {panelOpen && (
          <PropertiesPanel
            selectedBooths={selectedBooths}
            pavilions={mockData.pavilions}
            onUpdateBooth={handleUpdateBooth}
            onBulkUpdate={handleBulkUpdate}
            onDeleteBooths={handleDeleteBooths}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
}

// --- Context Menu Component ---

const ctxMenuStyle: React.CSSProperties = {
  position: "fixed",
  background: "#FFFFFF",
  border: "1px solid #D6D1C8",
  borderRadius: 6,
  padding: "4px 0",
  minWidth: 200,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  color: "#2D2A26",
  zIndex: 1000,
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
};

const ctxItemStyle: React.CSSProperties = {
  padding: "6px 16px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  whiteSpace: "nowrap",
};

const ctxItemDisabledStyle: React.CSSProperties = {
  ...ctxItemStyle,
  color: "#555",
  cursor: "default",
};

const ctxSeparatorStyle: React.CSSProperties = {
  height: 1,
  background: "#D6D1C8",
  margin: "4px 0",
};

interface ContextMenuOverlayProps {
  x: number;
  y: number;
  boothId: string | null;
  pavilions: Pavilion[];
  onEditProperties: () => void;
  onDuplicate: () => void;
  onChangePavilion: (pavilionId: string) => void;
  onSetStatus: (status: BoothStatus) => void;
  onAutoNumber: () => void;
  onDelete: () => void;
  onAddBoothHere: () => void;
  onAddRowHere: () => void;
}

function ContextMenuOverlay({
  x,
  y,
  boothId,
  pavilions,
  onEditProperties,
  onDuplicate,
  onChangePavilion,
  onSetStatus,
  onAutoNumber,
  onDelete,
  onAddBoothHere,
  onAddRowHere,
}: ContextMenuOverlayProps) {
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);

  // Clamp position to stay within viewport
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let ax = x;
      let ay = y;
      if (x + rect.width > window.innerWidth) ax = window.innerWidth - rect.width - 4;
      if (y + rect.height > window.innerHeight) ay = window.innerHeight - rect.height - 4;
      if (ax < 0) ax = 4;
      if (ay < 0) ay = 4;
      setAdjustedPos({ x: ax, y: ay });
    }
  }, [x, y]);

  const statusOptions: { value: BoothStatus; label: string }[] = [
    { value: "available", label: "Available" },
    { value: "held", label: "Held" },
    { value: "sold", label: "Sold" },
    { value: "blocked", label: "Blocked" },
  ];

  const isBooth = boothId !== null;

  return (
    <div
      ref={menuRef}
      data-testid="context-menu"
      style={{ ...ctxMenuStyle, left: adjustedPos.x, top: adjustedPos.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isBooth ? (
        <>
          {/* Booth context menu */}
          <div
            data-testid="ctx-edit-properties"
            style={ctxItemStyle}
            onClick={onEditProperties}
            onMouseEnter={() => setHoveredSubmenu(null)}
          >
            Edit Properties
          </div>
          <div
            data-testid="ctx-duplicate"
            style={ctxItemStyle}
            onClick={onDuplicate}
            onMouseEnter={() => setHoveredSubmenu(null)}
          >
            Duplicate
          </div>
          <div style={ctxSeparatorStyle} />

          {/* Change Pavilion submenu */}
          <div
            data-testid="ctx-change-pavilion"
            style={{ ...ctxItemStyle, position: "relative" }}
            onMouseEnter={() => setHoveredSubmenu("pavilion")}
          >
            <span>Change Pavilion</span>
            <span style={{ marginLeft: 12, fontSize: 10 }}>&#9654;</span>
            {hoveredSubmenu === "pavilion" && (
              <div
                style={{
                  ...ctxMenuStyle,
                  position: "absolute",
                  left: "100%",
                  top: 0,
                  marginLeft: -1,
                }}
              >
                {pavilions.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`ctx-pavilion-${p.id}`}
                    style={ctxItemStyle}
                    onClick={(e) => { e.stopPropagation(); onChangePavilion(p.id); }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: p.color,
                        display: "inline-block",
                        marginRight: 8,
                        flexShrink: 0,
                      }}
                    />
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Set Status submenu */}
          <div
            data-testid="ctx-set-status"
            style={{ ...ctxItemStyle, position: "relative" }}
            onMouseEnter={() => setHoveredSubmenu("status")}
          >
            <span>Set Status</span>
            <span style={{ marginLeft: 12, fontSize: 10 }}>&#9654;</span>
            {hoveredSubmenu === "status" && (
              <div
                style={{
                  ...ctxMenuStyle,
                  position: "absolute",
                  left: "100%",
                  top: 0,
                  marginLeft: -1,
                }}
              >
                {statusOptions.map((opt) => (
                  <div
                    key={opt.value}
                    data-testid={`ctx-status-${opt.value}`}
                    style={ctxItemStyle}
                    onClick={(e) => { e.stopPropagation(); onSetStatus(opt.value); }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: STATUS_COLORS[opt.value],
                        display: "inline-block",
                        marginRight: 8,
                        flexShrink: 0,
                      }}
                    />
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={ctxSeparatorStyle} />
          <div
            data-testid="ctx-auto-number"
            style={ctxItemStyle}
            onClick={onAutoNumber}
            onMouseEnter={() => setHoveredSubmenu(null)}
          >
            Auto-Number Selection
          </div>
          <div style={ctxSeparatorStyle} />
          <div
            data-testid="ctx-delete"
            style={{ ...ctxItemStyle, color: "#ef4444" }}
            onClick={onDelete}
            onMouseEnter={() => setHoveredSubmenu(null)}
          >
            Delete
          </div>
        </>
      ) : (
        <>
          {/* Empty canvas context menu */}
          <div
            data-testid="ctx-add-booth-here"
            style={ctxItemStyle}
            onClick={onAddBoothHere}
          >
            Add Booth Here
          </div>
          <div
            data-testid="ctx-add-row-here"
            style={ctxItemStyle}
            onClick={onAddRowHere}
          >
            Add Booth Row Here
          </div>
          <div style={ctxSeparatorStyle} />
          <div
            data-testid="ctx-paste"
            style={ctxItemDisabledStyle}
            title="No booths copied"
          >
            Paste
          </div>
        </>
      )}
    </div>
  );
}

// --- Grid Component ---

interface GridLinesProps {
  width: number;
  height: number;
  spacing: number;
  scale: number;
}

function GridLines({ width, height, spacing, scale }: GridLinesProps) {
  const lines: React.ReactElement[] = [];

  for (let x = 0; x <= width; x += spacing) {
    const isMajor = x % (spacing * 10) === 0;
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke={isMajor ? GRID_MAJOR_COLOR : GRID_COLOR}
        strokeWidth={(isMajor ? 1 : 0.5) / scale}
        dash={isMajor ? undefined : [4 / scale, 4 / scale]}
        listening={false}
      />
    );
  }

  for (let y = 0; y <= height; y += spacing) {
    const isMajor = y % (spacing * 10) === 0;
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke={isMajor ? GRID_MAJOR_COLOR : GRID_COLOR}
        strokeWidth={(isMajor ? 1 : 0.5) / scale}
        dash={isMajor ? undefined : [4 / scale, 4 / scale]}
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}
