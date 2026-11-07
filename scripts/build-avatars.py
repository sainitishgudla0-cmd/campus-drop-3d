"""Crop the generated avatar sheets (art-src/sheet-a.png, sheet-b.png) into public/avatars/*.webp.
Gutters are detected automatically (columns/rows that are almost entirely cream). Run: python scripts/build-avatars.py"""
import json, os
from PIL import Image

CREAM = (255, 241, 214)

def is_cream(px, tol=24):
    return all(abs(a - b) <= tol for a, b in zip(px, CREAM))

def bands(img, axis):
    w, h = img.size
    n, m = (w, h) if axis == 0 else (h, w)
    pix = img.load()
    content = []
    for i in range(n):
        step = max(1, m // 160)
        s = [pix[i, j] if axis == 0 else pix[j, i] for j in range(0, m, step)]
        content.append(sum(is_cream(p) for p in s) / len(s) < 0.9)
    spans, start = [], None
    for i, c in enumerate(content + [False]):
        if c and start is None:
            start = i
        elif not c and start is not None:
            if i - start > n * 0.08:
                spans.append((start, i))
            start = None
    return spans

os.makedirs("public/avatars", exist_ok=True)
manifest = []
for sheet in ("a", "b"):
    img = Image.open(f"art-src/sheet-{sheet}.png").convert("RGB")
    xs, ys = bands(img, 0), bands(img, 1)
    assert len(xs) == 4 and len(ys) == 3, f"sheet {sheet}: found {len(xs)}x{len(ys)}"
    k = 0
    for (y0, y1) in ys:
        for (x0, x1) in xs:
            k += 1
            t = img.crop((x0 + 4, y0 + 4, x1 - 4, y1 - 4))
            s = min(t.size); t = t.crop(((t.width - s) // 2, (t.height - s) // 2, (t.width - s) // 2 + s, (t.height - s) // 2 + s))
            t = t.resize((320, 320), Image.LANCZOS)
            aid = f"cd-{sheet}{k:02d}"
            t.save(f"public/avatars/{aid}.webp", "WEBP", quality=82, method=6)
            manifest.append({"id": aid, "bg": "#%02x%02x%02x" % t.getpixel((5, 5))})
json.dump(manifest, open("lib/avatars.json", "w"), indent=1)
print(len(manifest), "avatars,", sum(os.path.getsize("public/avatars/" + f) for f in os.listdir("public/avatars")) // 1024, "KB")
