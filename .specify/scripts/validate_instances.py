#!/usr/bin/env python3
"""SHACL instance validation for logistics-express Phase 0 fixtures."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ONTOLOGY = ROOT / ".specify" / "ontology"
GENERATED = ONTOLOGY / "logistics_domain.generated.ttl"
AXIOMS = ONTOLOGY / "logistics_domain.axioms.ttl"
SHACL = ONTOLOGY / "logistics_domain.shacl.ttl"
ENUMS = ONTOLOGY / "logistics_domain.shacl.enums.ttl"
FIXTURE = ONTOLOGY / "fixtures" / "phase0-valid.ttl"


class BlockingFailure(Exception):
    pass


def main() -> int:
    try:
        from rdflib import Graph
        from pyshacl import validate
    except ImportError as e:
        print(f"error: missing dependency: {e}", file=sys.stderr)
        return 1

    for path in (GENERATED, AXIOMS, SHACL, ENUMS, FIXTURE):
        if not path.is_file():
            raise BlockingFailure(f"missing {path.relative_to(ROOT)}")

    data = Graph()
    data.parse(GENERATED.resolve().as_uri(), format="turtle")
    data.parse(AXIOMS.resolve().as_uri(), format="turtle")
    data.parse(FIXTURE.resolve().as_uri(), format="turtle")

    shapes = Graph()
    shapes.parse(SHACL.resolve().as_uri(), format="turtle")
    shapes.parse(ENUMS.resolve().as_uri(), format="turtle")

    conforms, _, results_text = validate(
        data_graph=data,
        shacl_graph=shapes,
        inference="rdfs",
        abort_on_first=False,
        meta_shacl=False,
        advanced=True,
        inplace=False,
    )
    if not conforms:
        print("SHACL validation failed:", file=sys.stderr)
        print(results_text, file=sys.stderr)
        return 1
    print("SHACL instance validation: OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BlockingFailure as e:
        print(f"error: {e}", file=sys.stderr)
        raise SystemExit(1)
