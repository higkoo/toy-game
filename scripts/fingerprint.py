#!/usr/bin/env python3
"""给静态项目里的本地 JS/CSS 加内容指纹，并同步更新 HTML 引用。

用法：
  python3 scripts/fingerprint.py            # 处理全部项目
  python3 scripts/fingerprint.py benneng/src # 处理指定目录
  python3 scripts/fingerprint.py --check    # 只检查，不修改

规则：文件名形如 app.a1b2c3d4.js，哈希取内容 sha256 前 8 位。
脚本是幂等的：内容不变时不会改名；内容变化后会改新名字并更新引用。
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PROJECTS = [
    "anime-calculator/src",
    "benneng/src",
    "gomoku/src",
    "go/src",
    "jianzhi/src",
    "jingluo/src",
    "qihuang/src",
    "sanji/src",
    "seabreeze/src",
    "tetris/src",
    "xingzhao/src",
    "abyssbeacon/dist",
    "berth4/src",
    "dashcam/src",
    "skybreaker/src",
    "yangyu/src",
    "tangdou-cut/src",
]

HASHED = re.compile(r"^(?P<base>.+)\.[0-9a-f]{8}\.(?P<ext>js|css)$", re.I)
REF = re.compile(r"(?P<attr>\b(?:src|href))\s*=\s*(?P<q>[\"'])(?P<path>[^\"']+)(?P=q)", re.I)


def is_local(ref: str) -> bool:
    ref = ref.strip()
    if not ref or ref.startswith(("#", "//", "http://", "https://", "data:", "mailto:", "javascript:")):
        return False
    return ref.split("?", 1)[0].split("#", 1)[0].lower().endswith((".js", ".css"))


def clean(ref: str) -> str:
    return ref.split("?", 1)[0].split("#", 1)[0]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def desired_name(path: Path, hash8: str) -> str:
    m = HASHED.match(path.name)
    base = m.group("base") if m else path.stem
    return f"{base}.{hash8}{path.suffix.lower()}"


def html_files(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*.html") if p.is_file())


def assets(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in (".js", ".css"))


def refs(html: Path, root: Path):
    text = html.read_text(encoding="utf-8")
    for m in REF.finditer(text):
        raw = m.group("path")
        if not is_local(raw):
            continue
        rel = clean(raw)
        target = (html.parent / rel).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError:
            continue
        yield m, raw, target


def process(root: Path, check: bool) -> int:
    root = root.resolve()
    if not root.is_dir():
        print(f"SKIP {root} (not found)")
        return 0

    moved: dict[Path, Path] = {}
    problems: list[str] = []

    for asset in assets(root):
        h = digest(asset)
        target = asset.with_name(desired_name(asset, h))
        if asset == target:
            continue
        if check:
            problems.append(f"未加指纹或内容已变: {asset.relative_to(ROOT)}")
            continue
        if target.exists() and target != asset:
            target.unlink()
        asset.rename(target)
        moved[asset] = target
        print(f"  {asset.relative_to(root)} -> {target.name}")

    for html in html_files(root):
        text = html.read_text(encoding="utf-8")
        changed = False
        for m, raw, target in refs(html, root):
            new_target = moved.get(target, target)
            if check:
                if not target.exists():
                    problems.append(f"{html.relative_to(ROOT)} -> {raw} 不存在")
                    continue
                hm = HASHED.match(target.name)
                if not hm or digest(target) not in target.name:
                    problems.append(f"{html.relative_to(ROOT)} -> {raw} 无有效指纹")
                continue
            if new_target == target:
                continue
            rel = new_target.relative_to(html.parent.resolve()) if new_target.is_absolute() else new_target
            new_raw = str(rel).replace("\\", "/")
            if raw.startswith("./"):
                new_raw = "./" + new_raw
            text = text.replace(m.group(0), f'{m.group("attr")}={m.group("q")}{new_raw}{m.group("q")}', 1)
            changed = True
        if changed:
            html.write_text(text, encoding="utf-8")

    if check:
        # 目录里仍存在未加指纹的 JS/CSS
        for asset in assets(root):
            if not HASHED.match(asset.name) or digest(asset) not in asset.name:
                msg = f"{asset.relative_to(ROOT)} 文件名未带有效内容指纹"
                if msg not in problems:
                    problems.append(msg)
        if problems:
            for p in problems:
                print("FAIL", p)
            return len(problems)
        print(f"OK {root.relative_to(ROOT)}")
    else:
        print(f"DONE {root.relative_to(ROOT)}")
    return 0


def main() -> int:
    argv = [a for a in sys.argv[1:] if a != "--check"]
    check = "--check" in sys.argv
    roots = [Path(a) for a in argv] if argv else [ROOT / p for p in PROJECTS]
    failures = 0
    for root in roots:
        failures += process(root, check)
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
