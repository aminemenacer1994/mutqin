#!/usr/bin/env python3
"""Render Mutqin app icons (gradient tile + white mark)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MARK_PATH = ROOT / "public/icons/icon-mark.png"
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"

# Brand-aligned palette (resources/sass/app.scss)
GRADIENT_TOP = (166, 124, 82)  # #a67c52
GRADIENT_MID = (139, 94, 60)  # #8b5e3c
GRADIENT_END = (212, 165, 116)  # #d4a574

GRADIENT_DARK_TOP = (92, 61, 40)  # #5c3d28
GRADIENT_DARK_END = (139, 94, 60)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def tri_gradient_color(x: int, y: int, w: int, h: int, top: tuple, mid: tuple, end: tuple) -> tuple[int, int, int]:
    tx = x / max(w - 1, 1)
    ty = y / max(h - 1, 1)
    t = (tx * 0.55 + ty * 0.45)
    if t < 0.52:
        local = t / 0.52
        return lerp_color(top, mid, local)
    local = (t - 0.52) / 0.48
    return lerp_color(mid, end, local)


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def make_background(
    size: int,
    *,
    top: tuple[int, int, int] = GRADIENT_TOP,
    mid: tuple[int, int, int] = GRADIENT_MID,
    end: tuple[int, int, int] = GRADIENT_END,
) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    px = img.load()
    cx, cy = size * 0.28, size * 0.22
    max_r = size * 0.95
    for y in range(size):
        for x in range(size):
            base = tri_gradient_color(x, y, size, size, top, mid, end)
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy) / max_r
            shine = max(0.0, 1.0 - d * 1.15) * 0.22
            r = min(255, int(base[0] + shine * 255))
            g = min(255, int(base[1] + shine * 255))
            b = min(255, int(base[2] + shine * 255))
            vignette = 1.0 - (math.hypot(x - size / 2, y - size / 2) / (size * 0.72)) * 0.12
            r = int(r * vignette)
            g = int(g * vignette)
            b = int(b * vignette)
            px[x, y] = (r, g, b, 255)

    radius = int(size * 0.22)
    mask = rounded_rect_mask(size, radius)
    img.putalpha(mask)
    return img


def white_mark(size: int) -> Image.Image:
    mark = Image.open(MARK_PATH).convert("RGBA")
    mark = mark.resize((size, size), Image.Resampling.LANCZOS)
    _, _, _, alpha = mark.split()
    white = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    white.putalpha(alpha)
    return white


def compose_icon(
    canvas: int,
    *,
    mark_scale: float = 0.58,
    dark: bool = False,
) -> Image.Image:
  bg = make_background(
    canvas,
    top=GRADIENT_DARK_TOP if dark else GRADIENT_TOP,
    mid=GRADIENT_MID,
    end=GRADIENT_DARK_END if dark else GRADIENT_END,
  )
  mark_size = int(canvas * mark_scale)
  mark = white_mark(mark_size)
  shadow = mark.copy()
  shadow_alpha = shadow.split()[3]
  shadow_alpha = shadow_alpha.point(lambda a: int(a * 0.28) if a else 0)
  shadow.putalpha(shadow_alpha)
  shadow = shadow.filter(ImageFilter.GaussianBlur(max(1, canvas // 128)))

  x = (canvas - mark_size) // 2
  y = int(canvas * 0.19)
  out = bg.copy()
  out.alpha_composite(shadow, (x, y + max(1, canvas // 80)))
  out.alpha_composite(mark, (x, y))

  # subtle inner highlight stroke
  radius = int(canvas * 0.22)
  stroke = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
  draw = ImageDraw.Draw(stroke)
  draw.rounded_rectangle(
    (1, 1, canvas - 2, canvas - 2),
    radius=radius,
    outline=(255, 255, 255, int(255 * 0.14)),
    width=max(1, canvas // 256),
  )
  out = Image.alpha_composite(out, stroke)
  return out


def write_svg(path: Path, *, variant: str = "default", mark_href: str = "icons/icon-mark.png") -> None:
    if variant == "dark":
        stops = """
      <stop offset="0%" stop-color="#5c3d28"/>
      <stop offset="52%" stop-color="#8b5e3c"/>
      <stop offset="100%" stop-color="#9a6b45"/>"""
    else:
        stops = """
      <stop offset="0%" stop-color="#a67c52"/>
      <stop offset="52%" stop-color="#8b5e3c"/>
      <stop offset="100%" stop-color="#d4a574"/>"""

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Mutqin">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">{stops}
    </linearGradient>
    <radialGradient id="sheen" cx="28%" cy="22%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="markShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#3d2818" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="256" height="256" rx="56" fill="url(#bg)"/>
  <rect width="256" height="256" rx="56" fill="url(#sheen)"/>
  <rect x="1" y="1" width="254" height="254" rx="55" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(54 38) scale(0.58)" filter="url(#markShadow)">
    <image href="{mark_href}" width="256" height="256" style="filter: brightness(0) invert(1)"/>
  </g>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def main() -> None:
    sizes = {
        PUBLIC / "favicon-512.png": 512,
        PUBLIC / "favicon-192.png": 192,
        PUBLIC / "favicon-96x96.png": 96,
        PUBLIC / "favicon-48x48.png": 48,
        PUBLIC / "favicon-32x32.png": 32,
        PUBLIC / "favicon-16x16.png": 16,
        ICONS / "icon-512.png": 512,
        ICONS / "icon-192.png": 192,
        ICONS / "icon-512-maskable.png": 512,
        ICONS / "apple-touch-icon.png": 180,
        ICONS / "icon-mark-sq.png": 512,
    }

    for path, px in sizes.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        maskable = "maskable" in path.name
        scale = 0.48 if maskable else 0.58
        icon = compose_icon(px, mark_scale=scale)
        icon.save(path, format="PNG", optimize=True)

    sq = compose_icon(512)
    sq.save(ICONS / "icon-mark-sq.png", format="PNG", optimize=True)
    compose_icon(512).save(ICONS / "icon.png", format="PNG", optimize=True)

    ico_path = PUBLIC / "favicon.ico"
    icon_16 = compose_icon(16).convert("RGBA")
    icon_32 = compose_icon(32).convert("RGBA")
    icon_48 = compose_icon(48).convert("RGBA")
    icon_16.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    write_svg(PUBLIC / "favicon.svg", mark_href="icons/icon-mark.png")
    write_svg(ICONS / "icon.svg", mark_href="icon-mark.png")
    write_svg(PUBLIC / "favicon-light.svg", variant="default")
    write_svg(PUBLIC / "favicon-dark.svg", variant="dark")

    print("Rendered brand icons to public/ and public/icons/")


if __name__ == "__main__":
    main()