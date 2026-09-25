#!/usr/bin/env python3
"""Extract domain snapshot from reverse-engineered constants (+ light JS scrape).

Writes `.specify/ontology/snapshots/domain.snapshot.json`.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / ".specify" / "ontology" / "snapshots" / "domain.snapshot.json"
AUTH_JS = ROOT / "lib" / "auth.js"
INVENTORY_JS = ROOT / "lib" / "inventory.js"
SERVER_JS = ROOT / "server.js"

# Canonical Phase-0 constants (must match code; scrape verifies when files exist)
CANONICAL = {
    "version": "0.1.0-phase0",
    "source": "reverse-engineered from server.js + lib/*",
    "roles": ["driver", "pm", "admin"],
    "emailDomain": "@aes-energy.com",
    "locations": ["Warehouse", "Staging", "Loading Bay", "Back Tent"],
    "inventoryStatuses": ["received", "flagged", "completed", "shipped"],
    "deliveryStatuses": ["scheduled", "in_progress", "completed"],
    "livePoRegex": r"(\d{5})\s*[-\s]\s*(\d{2})",
    "fileType": "packing_slip",
    "entities": {
        "live": [
            "PackingSlipCapture",
            "PurchaseOrderRef",
            "Project",
            "Manufacturer",
            "FileServiceUpload",
        ],
        "deferred": [
            "User",
            "InventoryEntry",
            "Delivery",
            "JobPmDirectory",
            "WarehouseLocation",
            "QrTicket",
            "DeliveryTicket",
        ],
    },
}


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def verify_against_sources(snapshot: dict) -> list[str]:
    issues: list[str] = []
    auth = _read(AUTH_JS)
    inv = _read(INVENTORY_JS)
    server = _read(SERVER_JS)

    if auth:
        m = re.search(r"VALID_ROLES\s*=\s*\[([^\]]+)\]", auth)
        if m:
            roles = re.findall(r"'([^']+)'", m.group(1))
            if roles != snapshot["roles"]:
                issues.append(f"roles drift: code={roles} snapshot={snapshot['roles']}")
        if "@aes-energy.com" not in auth and snapshot["emailDomain"] not in auth:
            issues.append("email domain marker missing from lib/auth.js")

    if inv:
        m = re.search(r"return\s*\[([^\]]+)\]", inv)
        # getValidLocations body
        m2 = re.search(
            r"function getValidLocations\(\)\s*\{\s*return\s*\[([^\]]+)\]",
            inv,
        )
        if m2:
            locs = re.findall(r"'([^']+)'", m2.group(1))
            if locs != snapshot["locations"]:
                issues.append(
                    f"locations drift: code={locs} snapshot={snapshot['locations']}"
                )

    if server:
        if snapshot["livePoRegex"] not in server and r"(\d{5})" not in server:
            issues.append("live PO regex not found in server.js")
        # softer check: five-digit pattern present
        if not re.search(r"\\d\{5\}", server):
            issues.append("server.js missing \\d{5} PO pattern")

    return issues


def main() -> int:
    issues = verify_against_sources(CANONICAL)
    if issues:
        for i in issues:
            print(f"error: {i}", file=sys.stderr)
        return 1
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(json.dumps(CANONICAL, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {SNAPSHOT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
