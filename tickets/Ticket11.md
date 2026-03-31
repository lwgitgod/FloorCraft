# Ticket 11: Auto-Number Selected Booths

## Status: Complete

## What Was Implemented

Added "Auto-Number" functionality to the floor plan editor. When 2+ booths are selected, an "Auto-Number" toolbar button appears. Clicking it opens a modal where the user configures a prefix, start number, and sort direction, with a live preview of old-to-new number mappings. Applying updates all selected booth labels on the canvas.

### Changes to `src/components/FloorPlanEditor.tsx`:

1. **New state:** `autoNumberOpen` (boolean), `autoNumberConfig` (prefix, startNum, direction).

2. **Toolbar button:** "Auto-Number" button with `data-testid="auto-number-btn"`, conditionally rendered when `selectedIds.size >= 2`. Placed between the Add Booth Row button and the Color Mode toggle.

3. **Direction auto-detection:** `autoNumberDetectedDirection` memo compares the horizontal span (max xFt - min xFt) vs vertical span (max yFt - min yFt) of selected booths. Wider or equal defaults to "Left to Right"; taller defaults to "Top to Bottom".

4. **Default prefix derivation:** `autoNumberDefaultPrefix` memo extracts leading alphabetic characters from the first selected booth's number (e.g., "E100" -> "E").

5. **Preview generation:** `autoNumberPreview` memo sorts selected booths by position (xFt primary for LTR, yFt primary for TTB, with the other axis as tiebreaker) and maps each to `{ oldNumber, newNumber }`.

6. **`handleOpenAutoNumber` callback:** Initializes config with detected direction, derived prefix, and start number 101, then opens the modal.

7. **`handleApplyAutoNumber` callback:** Sorts selected booths, generates new numbers, and updates the `booths` state via `setBooths`. Closes the modal.

8. **Auto-Number Modal:** Full modal with prefix input, start number input, direction select, scrollable preview area, and Apply/Cancel buttons. Follows the same visual pattern as the Row Generator modal (dark theme, `rowGenInputStyle`, `RowGenField` components).

### data-testid Attributes:
| Element | data-testid |
|---|---|
| Toolbar button | `auto-number-btn` |
| Modal overlay | `auto-number-modal` |
| Prefix input | `auto-number-prefix` |
| Start number input | `auto-number-start` |
| Direction select | `auto-number-direction` |
| Preview area | `auto-number-preview` |
| Apply button | `auto-number-apply` |
| Cancel button | `auto-number-cancel` |

## What Was Tested

36 tests in `src/tests/ticket11.test.ts`:

| Category | Tests | Description |
|---|---|---|
| data-testid existence | 8 | Verifies all 8 testid strings exist in the component source |
| Sorting: LTR | 3 | Sort by xFt ascending, yFt tiebreaker, single booth |
| Sorting: TTB | 2 | Sort by yFt ascending, xFt tiebreaker |
| Direction detection | 7 | Horizontal row, vertical column, equal span, single booth, empty array, mixed offsets |
| Prefix extraction | 4 | Single letter, multi-letter, numeric-only, empty string |
| Preview generation | 4 | Horizontal row N101-N106, vertical column, unsorted input, empty prefix |
| Apply auto-number | 3 | Selected vs unselected booths, acceptance criteria (6 booths N101-N106), immutability |
| Edge cases | 4 | Same x/different y, same y/different x, diagonal layout, large start number, identical positions |

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       36 passed, 36 total
Time:        0.535 s
```

All tests pass.

## Notes

- The toolbar button is only visible when 2+ booths are selected, keeping the toolbar clean during normal use.
- Direction auto-detection uses a simple span comparison: if the horizontal spread of selected booths is >= the vertical spread, it defaults to Left-to-Right. This works well for row and column selections.
- The preview updates live as the user changes prefix, start number, or direction in the modal.
- The modal can be dismissed by clicking the backdrop, clicking Cancel, or pressing Apply.
- Sorting is stable: booths at identical positions preserve their original array order.
