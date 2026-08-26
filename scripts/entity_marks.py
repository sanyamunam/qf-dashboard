# -*- coding: utf-8 -*-
"""Derive the entity avatars in public/entities from QF's supplied lockups.

Source: `QF Observatory/Observatory Logos/Observatory Logos/Entities logos/PNG`
— the folder QF dropped, and the only place these come from. Committing the
derivation rather than hand-cropped files means anyone can re-run it when QF
re-issues a logo, and the crop boxes below are auditable rather than folklore.

Each avatar is the MARK, never the full lockup: at 20px a lockup with a
strapline ("An Initiative of Qatar Foundation") is an illegible smear. Where a
mark is separable it is cropped by its own ink bounds; where it is fused into
the wordmark (WISE's stacked stones, WISH's waveform) the distinctive glyph is
taken instead. Boxes are fractions of the source, so a re-export at a different
resolution still lands.
"""
import sys
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\user\OneDrive - applab.qa\QF Observatory"
    r"\Observatory Logos\Observatory Logos\Entities logos\PNG"
)
OUT = Path(__file__).resolve().parent.parent / "public" / "entities"
SIZE = 256

# file -> (out name, box as fractions of (w,h), note)
MARKS = {
    "DIFI.png": ("difi", (0.640, 0.300, 0.812, 0.535), "the leaf-and-D device, right of the wordmark"),
    "earthna.png": ("earthna", (0.660, 0.265, 0.885, 0.565), "the concentric target, right of the wordmark"),
    "WISE.png": ("wise", (0.4310, 0.4531, 0.5250, 0.6594), "the stacked stones that form the I in WISE"),
    "wish.png": ("wish", (0.228, 0.252, 0.470, 0.505), "the waveform that forms the W in WISH"),
    "Qatar Foundation.png": ("qf", (0.330, 0.235, 0.665, 0.530), "the sidra tree, above the wordmark"),
}


def tighten(im: Image.Image) -> Image.Image:
    """Crop to the ink actually inside the box, so a loose box still centres."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    step = max(1, min(w, h) // 200)
    xs = [x for x in range(0, w, step) if any(sum(px[x, y]) < 690 for y in range(0, h, step))]
    ys = [y for y in range(0, h, step) if any(sum(px[x, y]) < 690 for x in range(0, w, step))]
    if not xs or not ys:
        return im
    return im.crop((max(0, min(xs) - step), max(0, min(ys) - step), min(w, max(xs) + step), min(h, max(ys) + step)))


def to_transparent(im: Image.Image) -> Image.Image:
    """White ground out. These arrive as opaque PNGs and sit on cream cards."""
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = px[x, y]
            if r > 244 and g > 244 and b > 244:
                px[x, y] = (r, g, b, 0)
    return im


def main() -> int:
    if not SRC.is_dir():
        print(f"STOP: supplied logo folder not found:\n      {SRC}")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for src_name, (out_name, box, note) in MARKS.items():
        p = SRC / src_name
        if not p.exists():
            print(f"STOP: {src_name} missing from the supplied folder")
            return 1
        im = Image.open(p)
        w, h = im.size
        cut = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
        cut = to_transparent(tighten(cut))
        cw, ch = cut.size
        side = max(cw, ch)
        pad = int(side * 0.06)
        canvas = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (255, 255, 255, 0))
        canvas.paste(cut, ((side - cw) // 2 + pad, (side - ch) // 2 + pad), cut)
        canvas.resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f"{out_name}.png")
        print(f"{out_name}.png  <- {src_name}  ({note})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
