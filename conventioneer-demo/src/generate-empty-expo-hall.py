"""
Generate EmptyTusconExpoHall.PNG

The Tucson Expo Center is a "+" (plus/cross) shaped building:
- East Hall = top arm
- West Hall = bottom arm
- North Hall = left arm
- South Hall = right arm
- Center area where they all meet
- Two internal walls divide North/South halls from the center

Plus outdoor tent areas outside the building.

Usage: python generate-empty-expo-hall.py
Output: ../../EmptyTusconExpoHall.PNG
"""

import os
from PIL import Image, ImageDraw, ImageFont

# --- Canvas ---
W, H = 1738, 1420
S = 2  # scale factor (drawing at 2x of ~869x710 original)

def s(v):
    return int(v * S)

def sp(x, y):
    return (s(x), s(y))

# --- Colors ---
WHITE = (255, 255, 255)
BLACK = (40, 40, 40)
WALL = (60, 60, 60)
LIGHT_GRAY = (245, 245, 242)  # hall interior fill
WALL_WIDTH = 4
INNER_WALL_WIDTH = 3
OUTDOOR_FILL = (248, 245, 235)
LABEL_COLOR = (80, 80, 80)
JOGS_YELLOW = (255, 220, 0)

# --- Fonts ---
def load_font(size, bold=False):
    paths = [
        f"C:/Windows/Fonts/{'arialbd' if bold else 'arial'}.ttf",
        f"C:/Windows/Fonts/{'calibrib' if bold else 'calibri'}.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, s(size))
        except (IOError, OSError):
            continue
    return ImageFont.load_default()

font_title = load_font(18, bold=True)
font_subtitle = load_font(11)
font_hall = load_font(16, bold=True)
font_label = load_font(9)
font_small = load_font(7)
font_jogs = load_font(22, bold=True)
font_jogs_sub = load_font(6)

img = Image.new("RGB", (W, H), WHITE)
draw = ImageDraw.Draw(img)

def text_c(x, y, txt, font=font_label, fill=LABEL_COLOR):
    """Draw centered text at (x,y) in original coords."""
    bb = draw.textbbox((0, 0), txt, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    draw.text((s(x) - tw // 2, s(y) - th // 2), txt, font=font, fill=fill)

# =====================================================================
# THE BUILDING — one "+" shaped polygon
# =====================================================================
# Approximate coordinates from the original floor plan (in ~869x710 space)
#
# The "+" shape:
#        _______________
#       |   East Hall   |
#  _____|               |_____
# |North|    CENTER     |South|
# |Hall |               |Hall |
# |_____|               |_____|
#       |   West Hall   |
#       |_______________|
#
# With outdoor tents separately below/left

# Plus-shape vertices (clockwise from top-left of East Hall)
#   East Hall top: roughly x=250..540, y=70..155
#   North Hall: roughly x=25..250, y=155..475
#   Center: roughly x=250..540, y=155..475
#   South Hall: roughly x=540..790, y=100..475
#   West Hall bottom: roughly x=250..540, y=475..600

# The "+" outline as a single polygon
plus_shape = [
    # Top of East Hall (going clockwise)
    sp(250, 70),    # top-left of East Hall
    sp(540, 70),    # top-right of East Hall
    # Right side down to South Hall top
    sp(540, 100),   # where South Hall top starts (it extends higher)
    sp(790, 100),   # top-right of South Hall
    sp(790, 475),   # bottom-right of South Hall
    sp(540, 475),   # inner corner — bottom of South Hall meets West Hall
    # Down West Hall
    sp(540, 610),   # bottom-right of West Hall area
    sp(250, 610),   # bottom-left of West Hall area
    # Back up left side
    sp(250, 475),   # inner corner — bottom of North Hall
    sp(25, 475),    # bottom-left of North Hall
    sp(25, 155),    # top-left of North Hall
    sp(250, 155),   # inner corner — top of North Hall meets East Hall
]

# Draw filled building
draw.polygon(plus_shape, fill=LIGHT_GRAY, outline=WALL, width=WALL_WIDTH)

# =====================================================================
# INTERNAL WALLS — two walls dividing North/South from center
# =====================================================================
# Left internal wall (between North Hall and Center), with gaps for doorways
# This wall runs vertically at x≈250 from y≈155 to y≈475
# It has openings/doorways (gaps)
wall_x_left = 250
# Draw as segments with gaps for doors
for (y1, y2) in [(155, 210), (230, 310), (330, 380), (400, 475)]:
    draw.line([sp(wall_x_left, y1), sp(wall_x_left, y2)], fill=WALL, width=INNER_WALL_WIDTH)

# Right internal wall (between Center and South Hall) at x≈540
wall_x_right = 540
for (y1, y2) in [(155, 200), (220, 310), (330, 400), (420, 475)]:
    draw.line([sp(wall_x_right, y1), sp(wall_x_right, y2)], fill=WALL, width=INNER_WALL_WIDTH)

# Horizontal wall dividing East Hall from center area at y≈155
draw.line([sp(250, 155), sp(540, 155)], fill=WALL, width=INNER_WALL_WIDTH)

# Horizontal wall dividing center from West Hall area at y≈475
draw.line([sp(250, 475), sp(540, 475)], fill=WALL, width=INNER_WALL_WIDTH)

# =====================================================================
# HALL LABELS
# =====================================================================
text_c(395, 60, "East Hall", font=font_hall, fill=BLACK)
text_c(137, 145, "North Hall", font=font_hall, fill=BLACK)
text_c(665, 88, "South Hall", font=font_hall, fill=BLACK)
text_c(395, 540, "West Hall", font=font_hall, fill=BLACK)
text_c(760, 460, "South Hall", font=font_hall, fill=BLACK)

# =====================================================================
# OUTDOOR AREAS (separate from main building)
# =====================================================================
# Outdoor Dealers — bottom-left tents
draw.rectangle([sp(20, 500), sp(140, 600)], fill=OUTDOOR_FILL, outline=WALL, width=2)
text_c(80, 545, "Outdoor Dealers", font=font_label, fill=LABEL_COLOR)

# Outdoor Dealers Tents W — bottom strip
draw.rectangle([sp(140, 615), sp(380, 665)], fill=OUTDOOR_FILL, outline=WALL, width=2)
text_c(260, 632, "Outdoor Dealers", font=font_label, fill=LABEL_COLOR)
text_c(260, 648, "Tents W", font=font_small, fill=LABEL_COLOR)

# =====================================================================
# FOOD COURT
# =====================================================================
draw.rectangle([sp(160, 490), sp(340, 555)], fill=(252, 248, 240), outline=WALL, width=2)
text_c(250, 513, "International", font=font_label, fill=LABEL_COLOR)
text_c(250, 530, "Food Court", font=font_label, fill=LABEL_COLOR)

# =====================================================================
# REGISTRATION
# =====================================================================
draw.rectangle([sp(300, 575), sp(430, 608)], fill=(230, 238, 248), outline=WALL, width=2)
text_c(365, 588, "West Hall Registration", font=font_small, fill=LABEL_COLOR)

# Entrance arrows
for ax in [360, 400]:
    cx, cy = s(ax), s(618)
    draw.polygon([(cx - s(5), cy + s(8)), (cx + s(5), cy + s(8)), (cx, cy)], fill=(200, 0, 0))

# =====================================================================
# BRANDING & EXTERNAL LABELS
# =====================================================================
# JOGS logo
draw.rectangle([sp(35, 25), sp(115, 75)], fill=JOGS_YELLOW, outline=BLACK, width=3)
text_c(75, 38, "JOGS", font=font_jogs, fill=BLACK)
text_c(75, 58, "INTERNATIONAL EXHIBITS", font=font_jogs_sub, fill=BLACK)

# Title
text_c(660, 18, "GEM AND JEWELRY SHOW", font=font_title, fill=BLACK)
text_c(660, 38, "TUCSON EXPO CENTER", font=font_subtitle, fill=LABEL_COLOR)
text_c(660, 52, "January 30 - February 10, 2026", font=font_subtitle, fill=LABEL_COLOR)

# FREE PARKING labels
text_c(170, 55, "FREE", font=font_hall, fill=LABEL_COLOR)
text_c(170, 73, "PARKING", font=font_hall, fill=LABEL_COLOR)
text_c(640, 73, "FREE PARKING", font=font_label, fill=LABEL_COLOR)
text_c(610, 620, "FREE", font=font_hall, fill=LABEL_COLOR)
text_c(610, 640, "PARKING", font=font_hall, fill=LABEL_COLOR)

# Valet Parking
draw.rectangle([sp(795, 220), sp(845, 280)], fill=(235, 245, 235), outline=(160, 160, 160), width=1)
text_c(820, 240, "Valet", font=font_label, fill=LABEL_COLOR)
text_c(820, 255, "Parking", font=font_label, fill=LABEL_COLOR)

# Shuttle Hub
draw.rectangle([sp(755, 605), sp(835, 660)], fill=(215, 230, 245), outline=WALL, width=2)
text_c(795, 622, "Shuttle", font=font_hall, fill=LABEL_COLOR)
text_c(795, 642, "Hub", font=font_hall, fill=LABEL_COLOR)

# =====================================================================
# SAVE
# =====================================================================
out = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "EmptyTusconExpoHall.PNG"))
img.save(out, "PNG")
print(f"Generated: {out} ({img.size[0]}x{img.size[1]})")
