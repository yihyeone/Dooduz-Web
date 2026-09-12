#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "images" / "flower-assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

# legacy.html is intentionally kept untouched as a rollback snapshot.
TARGETS = [
    ROOT / "app.html",
    ROOT / "index.html",
    ROOT / "guild-catalog-images.js",
    ROOT / "flower-update.js",
]
TARGETS += sorted((ROOT / "images").glob("*.js"))

DATA_RE = re.compile(
    r'(?P<q>[\"\'])(?P<uri>data:image/(?P<mime>png|jpe?g|webp);base64,(?P<b64>[A-Za-z0-9+/=]+))(?P=q)'
)

EXT = {"png": "png", "jpg": "jpg", "jpeg": "jpg", "webp": "webp"}

stats = {}
all_assets = set()

for path in TARGETS:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    before = len(text)
    replaced = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal_replaced = None
        del nonlocal_replaced
        raw = base64.b64decode(m.group("b64"), validate=True)
        digest = hashlib.sha256(raw).hexdigest()[:20]
        ext = EXT[m.group("mime")]
        rel = f"./images/flower-assets/{digest}.{ext}"
        out = ROOT / rel.removeprefix("./")
        if not out.exists():
            out.write_bytes(raw)
        all_assets.add(rel)
        q = m.group("q")
        return f"{q}{rel}{q}"

    # count separately because re.sub callback has no convenient nonlocal counter at module scope
    matches = list(DATA_RE.finditer(text))
    replaced = len(matches)
    if replaced:
        text = DATA_RE.sub(repl, text)
        path.write_text(text, encoding="utf-8")

    remaining = text.count("data:image/")
    stats[str(path.relative_to(ROOT))] = {
        "replaced": replaced,
        "bytes_before": before,
        "bytes_after": len(text),
        "remaining_data_image_tokens": remaining,
    }

critical = [ROOT / "app.html", ROOT / "index.html", ROOT / "guild-catalog-images.js"]
for path in critical:
    if path.exists() and "data:image/" in path.read_text(encoding="utf-8"):
        raise SystemExit(f"Refactor incomplete: data:image remains in {path.name}")

if stats.get("app.html", {}).get("replaced", 0) < 100:
    raise SystemExit(
        f"Safety stop: expected at least 100 embedded images in app.html, found {stats.get('app.html', {}).get('replaced', 0)}"
    )

# Confirm every generated reference resolves to a file.
ref_re = re.compile(r'\./images/flower-assets/([0-9a-f]{20}\.(?:png|jpg|webp))')
for path in TARGETS:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for name in ref_re.findall(text):
        if not (ASSET_DIR / name).exists():
            raise SystemExit(f"Missing generated asset {name} referenced by {path.relative_to(ROOT)}")

manifest = {
    "version": 1,
    "asset_count": len(list(ASSET_DIR.glob("*.*"))),
    "files": stats,
}
(ASSET_DIR / "manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

print(json.dumps(manifest, ensure_ascii=False, indent=2))
