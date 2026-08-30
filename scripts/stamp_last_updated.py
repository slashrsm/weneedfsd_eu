#!/usr/bin/env python3
"""Stamp footer Last updated to today in Europe/Ljubljana. Used by Pages deploy.
# Wire-up for GitHub Pages (needs a token with `workflow` scope to commit
# .github/workflows/deploy.yml): after checkout, before the LFS teardown:
#   - name: Stamp Last updated
#     run: python3 scripts/stamp_last_updated.py
"""
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = "Last updated: "

now = datetime.now(ZoneInfo("Europe/Ljubljana"))
stamp = f"{now.day} {now.strftime('%B %Y')}"
text = INDEX.read_text()
start = text.find(MARKER)
if start < 0:
    raise SystemExit("Last updated marker not found in index.html")
end = text.find("<", start)
if end < 0:
    raise SystemExit("could not find end of Last updated text")
new = text[:start] + MARKER + stamp + "." + text[end:]
if new == text:
    print(f"already {stamp}")
else:
    INDEX.write_text(new)
    print(f"stamped Last updated: {stamp}.")
