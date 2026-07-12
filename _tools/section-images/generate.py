#!/usr/bin/env python3
"""
Generate the four per-section images for a Darice on AI issue.

One image per tool (Claude, ChatGPT, Copilot, Gemini), each a "feature card":
the platform's name + accent color + a simple icon + the one-line feature label
for that section, on the site's dark card. Output is raster PNG (email clients
strip SVG), sized 1200x500, supersampled 2x for crisp anti-aliasing.

Usage:
    python generate.py <config.json>      # reads an issue config
    python generate.py                    # builds the bundled example issue

Config shape (see 2026-07-09.json):
{
  "outdir": "assets/blog/2026-07-09",
  "sections": [
    {"platform":"Claude","accent":"#d97757","icon":"photo_text","label":"..."},
    ...
  ]
}
Files are written as <platform-lowercased>.png in outdir.

Run from the repo root so outdir resolves correctly. Fonts are Segoe UI
(present on Windows); drop DM Sans TTFs in this folder and repoint FONT_* to
match the site exactly.
"""

import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SS = 2                      # supersample factor
W, H = 1200, 500           # logical canvas size
BG = "#16131f"
CREAM = "#ede9f6"
MUTED = "#a9a4c2"

FONT_EYEBROW = "C:/Windows/Fonts/segoeuib.ttf"    # bold  -> platform name
FONT_LABEL   = "C:/Windows/Fonts/segoeuil.ttf"    # light -> feature line
FONT_TAG     = "C:/Windows/Fonts/segoeuisl.ttf"   # semilight -> footer

def S(v):
    return int(round(v * SS))

def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def blend(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))

def font(path, size):
    return ImageFont.truetype(path, S(size))

def tracked(d, x, y, text, fnt, fill, tracking, center=False):
    """Draw letter-spaced text, anchored at vertical middle (lm)."""
    ws = [d.textlength(c, font=fnt) for c in text]
    total = sum(ws) + S(tracking) * (len(text) - 1)
    x = S(x)
    if center:
        x -= total / 2
    for c, w in zip(text, ws):
        d.text((x, S(y)), c, font=fnt, fill=fill, anchor="lm")
        x += w + S(tracking)

def wrap(d, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=fnt) <= S(maxw):
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

# ---- icons -------------------------------------------------------------
# Each icon draws in the accent color, roughly centered near (600, 225).

def _frame(d, box, accent, soft):
    d.rounded_rectangle([S(box[0]), S(box[1]), S(box[2]), S(box[3])],
                        radius=S(16), fill=soft, outline=accent, width=S(4))

def icon_photo_text(d, accent, soft, bg):
    _frame(d, (470, 150, 690, 300), accent, soft)
    bars = [(150, 0.85), (120, 0.6), (140, 0.6), (90, 0.35)]
    y = 182
    for w, op in bars:
        c = blend(bg, accent, op)
        d.rounded_rectangle([S(500), S(y), S(500 + w), S(y + 12)], radius=S(6), fill=c)
        y += 28
    d.ellipse([S(658), S(270), S(718), S(330)], outline=accent, width=S(5))
    d.line([S(710), S(322), S(736), S(348)], fill=accent, width=S(7))

def icon_target_photo(d, accent, soft, bg):
    _frame(d, (470, 150, 690, 300), accent, soft)
    cx, cy, r = 580, 225, 46
    d.ellipse([S(cx - r), S(cy - r), S(cx + r), S(cy + r)], outline=accent, width=S(4))
    d.ellipse([S(cx - 6), S(cy - 6), S(cx + 6), S(cy + 6)], fill=accent)
    for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        x0 = cx + dx * (r - 10); y0 = cy + dy * (r - 10)
        x1 = cx + dx * (r + 12); y1 = cy + dy * (r + 12)
        d.line([S(x0), S(y0), S(x1), S(y1)], fill=accent, width=S(4))

def icon_live_camera(d, accent, soft, bg):
    d.rounded_rectangle([S(455), S(152), S(515), S(172)], radius=S(6), fill=soft, outline=accent, width=S(3))
    _frame(d, (450, 170, 640, 300), accent, soft)
    cx, cy = 545, 235
    d.ellipse([S(cx - 42), S(cy - 42), S(cx + 42), S(cy + 42)], outline=accent, width=S(4))
    d.ellipse([S(cx - 22), S(cy - 22), S(cx + 22), S(cy + 22)], outline=accent, width=S(4))
    d.ellipse([S(cx - 8), S(cy - 8), S(cx + 8), S(cy + 8)], fill=accent)
    for r, op in ((26, 0.8), (48, 0.5), (70, 0.3)):
        c = blend(bg, accent, op)
        d.arc([S(660 - r), S(cy - r), S(660 + r), S(cy + r)], start=-52, end=52, fill=c, width=S(6))

def icon_snap_camera(d, accent, soft, bg):
    d.polygon([S(555), S(162), S(645), S(162), S(632), S(180), S(568), S(180)], fill=soft, outline=accent)
    d.rounded_rectangle([S(665), S(164), S(700), S(180)], radius=S(4), fill=blend(bg, accent, 0.7))
    _frame(d, (490, 178, 710, 302), accent, soft)
    cx, cy = 600, 240
    d.ellipse([S(cx - 42), S(cy - 42), S(cx + 42), S(cy + 42)], outline=accent, width=S(4))
    d.ellipse([S(cx - 22), S(cy - 22), S(cx + 22), S(cy + 22)], outline=accent, width=S(4))
    d.ellipse([S(cx - 7), S(cy - 7), S(cx + 7), S(cy + 7)], fill=accent)

def icon_doc_stack(d, accent, soft, bg):
    # two offset pages behind a front page: a long or multi-file document
    d.rounded_rectangle([S(524), S(158), S(692), S(298)], radius=S(14), fill=soft, outline=blend(bg, accent, 0.45), width=S(3))
    d.rounded_rectangle([S(508), S(170), S(676), S(310)], radius=S(14), fill=soft, outline=blend(bg, accent, 0.7), width=S(3))
    d.rounded_rectangle([S(492), S(182), S(660), S(322)], radius=S(16), fill=soft, outline=accent, width=S(4))
    y = 212
    for w, op in [(140, 0.85), (120, 0.6), (140, 0.6), (95, 0.35)]:
        d.rounded_rectangle([S(514), S(y), S(514 + w), S(y + 11)], radius=S(6), fill=blend(bg, accent, op))
        y += 25

def icon_doc_extract(d, accent, soft, bg):
    # a page with one line pulled out to the right: extract the answer
    d.rounded_rectangle([S(452), S(160), S(612), S(310)], radius=S(16), fill=soft, outline=accent, width=S(4))
    y = 190
    for w, op in [(118, 0.5), (98, 0.5), (118, 0.5)]:
        d.rounded_rectangle([S(474), S(y), S(474 + w), S(y + 10)], radius=S(5), fill=blend(bg, accent, op))
        y += 24
    d.rounded_rectangle([S(474), S(y), S(474 + 118), S(y + 16)], radius=S(8), fill=accent)
    ay = y + 8
    d.line([S(612), S(ay), S(672), S(ay)], fill=accent, width=S(5))
    d.polygon([S(670), S(ay - 11), S(692), S(ay), S(670), S(ay + 11)], fill=accent)

def icon_doc_browser(d, accent, soft, bg):
    # a browser window with a summary sidebar: summarize the page you have open
    d.rounded_rectangle([S(448), S(156), S(712), S(312)], radius=S(16), fill=soft, outline=accent, width=S(4))
    d.line([S(448), S(190), S(712), S(190)], fill=accent, width=S(3))
    for cx in (472, 492, 512):
        d.ellipse([S(cx - 5), S(168), S(cx + 5), S(178)], fill=blend(bg, accent, 0.6))
    y = 208
    for w in (150, 130, 150, 108):
        d.rounded_rectangle([S(470), S(y), S(470 + w), S(y + 10)], radius=S(5), fill=blend(bg, accent, 0.4))
        y += 22
    d.rounded_rectangle([S(636), S(198), S(700), S(300)], radius=S(10), fill=blend(bg, accent, 0.14), outline=accent, width=S(3))
    y = 212
    for w, op in [(46, 0.85), (40, 0.7), (46, 0.7), (30, 0.5)]:
        d.rounded_rectangle([S(648), S(y), S(648 + w), S(y + 8)], radius=S(4), fill=blend(bg, accent, op))
        y += 18

def icon_doc_upload(d, accent, soft, bg):
    # a page with an up arrow: upload a file and ask
    cx = 580
    d.polygon([S(cx - 26), S(178), S(cx), S(150), S(cx + 26), S(178)], fill=accent)
    d.line([S(cx), S(160), S(cx), S(206)], fill=accent, width=S(8))
    d.line([S(cx - 42), S(218), S(cx + 42), S(218)], fill=blend(bg, accent, 0.6), width=S(5))
    d.rounded_rectangle([S(500), S(236), S(660), S(330)], radius=S(16), fill=soft, outline=accent, width=S(4))
    y = 262
    for w, op in [(116, 0.5), (96, 0.5), (116, 0.35)]:
        d.rounded_rectangle([S(522), S(y), S(522 + w), S(y + 10)], radius=S(5), fill=blend(bg, accent, op))
        y += 22

ICONS = {
    "photo_text": icon_photo_text,
    "target_photo": icon_target_photo,
    "live_camera": icon_live_camera,
    "snap_camera": icon_snap_camera,
    "doc_stack": icon_doc_stack,
    "doc_extract": icon_doc_extract,
    "doc_browser": icon_doc_browser,
    "doc_upload": icon_doc_upload,
}

# ---- card --------------------------------------------------------------

def render_card(platform, accent_hex, icon_key, label):
    bg = hexrgb(BG)
    accent = hexrgb(accent_hex)
    soft = blend(bg, accent, 0.08)

    base = Image.new("RGBA", (S(W), S(H)), bg + (255,))

    # soft accent glow behind the icon
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([S(600 - 360), S(230 - 250), S(600 + 360), S(230 + 250)], fill=accent + (255,))
    glow = glow.filter(ImageFilter.GaussianBlur(S(95)))
    glow.putalpha(glow.split()[3].point(lambda a: int(a * 0.16)))
    base.alpha_composite(glow)

    d = ImageDraw.Draw(base)
    ICONS[icon_key](d, accent, soft, bg)

    tracked(d, 72, 72, platform.upper(), font(FONT_EYEBROW, 30), accent, tracking=7)

    lab = font(FONT_LABEL, 32)
    lines = wrap(d, label, lab, 1000)
    y = 400 if len(lines) == 1 else 382
    for ln in lines:
        d.text((S(W / 2), S(y)), ln, font=lab, fill=hexrgb(CREAM), anchor="mm")
        y += 42
    tracked(d, W / 2, y + 8, "DARICE ON AI", font(FONT_TAG, 16), hexrgb(MUTED), tracking=4, center=True)

    return base.convert("RGB").resize((W, H), Image.LANCZOS)

def generate(config, root="."):
    outdir = os.path.join(root, config["outdir"])
    os.makedirs(outdir, exist_ok=True)
    written = []
    for sec in config["sections"]:
        img = render_card(sec["platform"], sec["accent"], sec["icon"], sec["label"])
        path = os.path.join(outdir, sec["platform"].lower() + ".png")
        img.save(path, "PNG")
        written.append(path)
    return written

EXAMPLE = {
    "outdir": "assets/blog/2026-07-09",
    "sections": [
        {"platform": "Claude",  "accent": "#d97757", "icon": "photo_text",   "label": "Read the words and detail inside a photo"},
        {"platform": "ChatGPT", "accent": "#10a37f", "icon": "target_photo",  "label": "Point at what matters and identify it"},
        {"platform": "Copilot", "accent": "#2e7df6", "icon": "live_camera",   "label": "Point your live camera and ask out loud"},
        {"platform": "Gemini",  "accent": "#9168e8", "icon": "snap_camera",   "label": "Snap a photo in the moment and ask"},
    ],
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            cfg = json.load(f)
    else:
        cfg = EXAMPLE
    for p in generate(cfg):
        print("wrote", p)
