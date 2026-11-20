#!/usr/bin/env python3
"""Toy 入口的浏览器冒烟：加载成功且无 pageerror / console.error。"""

from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ENTRIES = [
    "anime-calculator/src/index.html",
    "benneng/src/index.html",
    "gomoku/src/index.html",
    "go/src/index.html",
    "jianzhi/src/index.html",
    "qihuang/src/index.html",
    "qihuang/src/kb/bencao.html",
    "sanji/src/index.html",
    "seabreeze/src/index.html",
    "tetris/src/index.html",
    "xingzhao/src/index.html",
    "abyssbeacon/dist/index.html",
    "berth4/src/index.html",
    "dashcam/src/index.html",
    "skybreaker/src/index.html",
    "yangyu/src/index.html",
]
HEAVY = {"skybreaker", "berth4", "yangyu", "xingzhao", "dashcam"}


def main() -> int:
    failures: list[str] = []
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        except Exception:
            browser = p.chromium.launch(
                headless=True,
                executable_path="/usr/local/bin/chromium",
                args=["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
            )
        for rel in ENTRIES:
            page = browser.new_page(viewport={"width": 390, "height": 844})
            errors: list[str] = []
            page.on("pageerror", lambda exc, errors=errors: errors.append(str(exc)))
            page.on(
                "console",
                lambda msg, errors=errors: errors.append("console: " + msg.text)
                if msg.type == "error"
                else None,
            )
            try:
                page.goto((ROOT / rel).as_uri(), wait_until="load", timeout=90_000)
                page.wait_for_timeout(1500 if rel.split("/")[0] in HEAVY else 600)
                title = page.title()
                if not title.strip():
                    errors.append("页面没有 title")
            except Exception as exc:
                errors.append(f"加载失败: {exc}")
            finally:
                page.close()
            if errors:
                failures.append(f"{rel}: {errors}")
                print(f"FAIL {rel}")
                for e in errors:
                    print(f"  - {e}")
            else:
                print(f"OK {rel}  ({title})")
        browser.close()
    if failures:
        print(f"\n{len(failures)} 个入口失败")
        return 1
    print(f"\n{len(ENTRIES)} 个入口全部通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
