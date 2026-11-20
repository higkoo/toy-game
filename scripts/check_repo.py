#!/usr/bin/env python3
"""仓库级静态检查：入口存在、入口体积、本地资源引用、封面比例。"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENTRIES = {
    "anime-calculator": "anime-calculator/src/index.html",
    "benneng": "benneng/src/index.html",
    "gomoku": "gomoku/src/index.html",
    "go": "go/src/index.html",
    "jianzhi": "jianzhi/src/index.html",
    "qihuang": "qihuang/src/index.html",
    "jingluo": "jingluo/src/index.html",
    "sanji": "sanji/src/index.html",
    "seabreeze": "seabreeze/src/index.html",
    "tetris": "tetris/src/index.html",
    "xingzhao": "xingzhao/src/index.html",
    "abyssbeacon": "abyssbeacon/dist/index.html",
    "berth4": "berth4/src/index.html",
    "dashcam": "dashcam/src/index.html",
    "skybreaker": "skybreaker/src/index.html",
    "yangyu": "yangyu/src/index.html",
}
ENTRY_LIMIT = 1024 * 1024
REF = re.compile(r"(?:src|href)\s*=\s*([\"'])(?P<path>[^\"']+)\1", re.I)


def check_entry(name: str, rel: str) -> list[str]:
    errors = []
    path = ROOT / rel
    if not path.exists():
        return [f"{name}: 入口不存在 {rel}"]
    size = path.stat().st_size
    if size >= ENTRY_LIMIT:
        errors.append(f"{name}: 入口 index.html {size} B，超过 1MB 上限")
    project = path.parent.parent
    htmls = sorted(p for p in project.rglob("*.html") if not ({"hyf", "rem"} & set(p.parts)))
    for html_path in htmls:
        html = html_path.read_text(encoding="utf-8", errors="ignore")
        for m in REF.finditer(html):
            ref = m.group("path").strip()
            if ref.startswith(("http://", "https://", "//", "data:", "#", "mailto:", "javascript:")):
                continue
            local = ref.split("?", 1)[0].split("#", 1)[0]
            if not local:
                continue
            target = (html_path.parent / local).resolve()
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                errors.append(f"{name}: 越界引用 {ref}（{html_path.relative_to(ROOT)}）")
                continue
            if not target.exists():
                errors.append(f"{name}: 引用不存在 {ref}（{html_path.relative_to(ROOT)}）")
    return errors


def poster_note(name: str, rel: str) -> str | None:
    path = ROOT / rel
    if not path.exists():
        return None
    try:
        from PIL import Image
    except Exception:
        return None
    with Image.open(path) as im:
        w, h = im.size
    ratio = w / h
    if abs(ratio - 4 / 3) > 0.08:
        return f"{name}: 封面 {w}x{h}，比例 {ratio:.2f}，README 要求约 4:3"
    return None


def main() -> int:
    errors: list[str] = []
    notes: list[str] = []
    for name, rel in ENTRIES.items():
        errors += check_entry(name, rel)
    for name, rel in {
        "abyssbeacon": "abyssbeacon/assets/poster.jpg",
        "berth4": "berth4/assets/poster.jpg",
        "dashcam": "dashcam/assets/poster.jpg",
        "jianzhi": "jianzhi/src/img/poster.jpg",
        "sanji": "sanji/src/img/poster.jpg",
        "seabreeze": "seabreeze/assets/poster.jpg",
    }.items():
        note = poster_note(name, rel)
        if note:
            notes.append(note)

    for name in sorted(ENTRIES):
        print(f"OK {name}")
    for n in notes:
        print(f"NOTE {n}")
    for e in errors:
        print(f"FAIL {e}")
    if errors:
        print(f"\n{len(errors)} 个错误")
        return 1
    print("\n静态检查通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
