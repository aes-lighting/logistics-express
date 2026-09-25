#!/usr/bin/env python3
"""Spec Kit ontology validation for logistics-express (Phase 0 foundation).

Three labeled gates (all required):

  1. Spec Kit ontology contract validation — deps, files, markers, freshness
  2. SHACL instance validation — fixtures via validate_instances.py
  3. OWL-RL TBox consistency — validate_owl.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from ontology_map import ENTITY_TO_CLASS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SPECIFY = ROOT / ".specify"
ONTOLOGY = SPECIFY / "ontology"
SNAPSHOT = ONTOLOGY / "snapshots" / "domain.snapshot.json"
GENERATED = ONTOLOGY / "logistics_domain.generated.ttl"
ENUMS = ONTOLOGY / "logistics_domain.shacl.enums.ttl"

REQUIRED_FILES = [
    SPECIFY / "spec.md",
    SPECIFY / "memory" / "constitution.md",
    SPECIFY / "memory" / "project-context.md",
    SPECIFY / "mvp-definition.md",
    SPECIFY / "specs" / "001-incoming-packing-slip" / "spec.md",
    SPECIFY / "specs" / "002-deferred-logistics-platform" / "spec.md",
    ONTOLOGY / "README.md",
    ONTOLOGY / "logistics_domain.ttl",
    GENERATED,
    ONTOLOGY / "logistics_domain.axioms.ttl",
    ONTOLOGY / "logistics_domain.shacl.ttl",
    ENUMS,
    ONTOLOGY / "catalog-v001.xml",
    ONTOLOGY / "fixtures" / "phase0-valid.ttl",
    ONTOLOGY / "residuals.md",
    SNAPSHOT,
    SPECIFY / "evidence" / "ontology-phase-0-foundation.md",
    SCRIPTS / "requirements.txt",
    SCRIPTS / "ontology_map.py",
    SCRIPTS / "extract_domain_snapshot.py",
    SCRIPTS / "generate_ontology.py",
    SCRIPTS / "validate_spec.py",
    SCRIPTS / "validate_instances.py",
    SCRIPTS / "validate_owl.py",
]

REQUIRED_SPEC_MARKERS = [
    "OntologyRequired",
    "PolicyNoSecretsInGit",
    "PolicyDualSurfaceHonesty",
    "PolicyNoInventLiveRoutesFromLib",
]

REQUIRED_AXIOM_MARKERS = [
    "PolicyNoSecretsInGit",
    "PolicyDualSurfaceHonesty",
    "PolicyNoInventLiveRoutesFromLib",
    "OntologyRequired",
    "LiveSurface",
    "DeferredDomain",
]


class BlockingFailure(Exception):
    pass


def gate1_contract() -> None:
    print("=== Gate 1: Spec Kit ontology contract ===")
    try:
        import rdflib  # noqa: F401
        import pyshacl  # noqa: F401
        import owlrl  # noqa: F401
    except ImportError as e:
        raise BlockingFailure(f"missing Python dependency: {e}") from e

    missing = [p for p in REQUIRED_FILES if not p.is_file()]
    if missing:
        raise BlockingFailure(
            "missing required files:\n  "
            + "\n  ".join(str(p.relative_to(ROOT)) for p in missing)
        )

    spec_text = (SPECIFY / "spec.md").read_text(encoding="utf-8")
    for marker in REQUIRED_SPEC_MARKERS:
        if marker not in spec_text:
            raise BlockingFailure(f"spec.md missing marker: {marker}")

    axioms = (ONTOLOGY / "logistics_domain.axioms.ttl").read_text(encoding="utf-8")
    for marker in REQUIRED_AXIOM_MARKERS:
        if marker not in axioms:
            raise BlockingFailure(f"axioms missing marker: {marker}")

    mvp = (SPECIFY / "mvp-definition.md").read_text(encoding="utf-8")
    if "STATUS: TBD" not in mvp:
        raise BlockingFailure("mvp-definition.md must retain STATUS: TBD until owner update")

    # Parse Turtle catalog + generated + axioms
    from rdflib import Graph, URIRef, RDF, OWL, RDFS

    for path in (
        ONTOLOGY / "logistics_domain.ttl",
        GENERATED,
        ONTOLOGY / "logistics_domain.axioms.ttl",
        ONTOLOGY / "logistics_domain.shacl.ttl",
        ENUMS,
    ):
        g = Graph()
        g.parse(path.resolve().as_uri(), format="turtle")

    # Entity coverage vs generated classes
    gen = Graph()
    gen.parse(GENERATED.resolve().as_uri(), format="turtle")
    ns = "https://aes-lighting.internal/ns/logistics#"
    for entity, cls in ENTITY_TO_CLASS.items():
        uri = URIRef(ns + cls)
        if (uri, RDF.type, OWL.Class) not in gen and (
            uri,
            RDF.type,
            RDFS.Class,
        ) not in gen:
            # owl:Class assertion from our generator
            if (uri, RDF.type, OWL.Class) not in gen:
                # check any type triple
                types = list(gen.objects(uri, RDF.type))
                if OWL.Class not in types:
                    raise BlockingFailure(
                        f"ENTITY_TO_CLASS {entity} → log:{cls} missing owl:Class in generated.ttl"
                    )

    # Freshness: regenerate into temp and compare
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        # run generate against real snapshot but capture by comparing after dry rewrite
        before_gen = GENERATED.read_bytes()
        before_enum = ENUMS.read_bytes()
        r = subprocess.run(
            [sys.executable, str(SCRIPTS / "generate_ontology.py")],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            # restore
            GENERATED.write_bytes(before_gen)
            ENUMS.write_bytes(before_enum)
            raise BlockingFailure(f"generate_ontology.py failed:\n{r.stderr}")
        after_gen = GENERATED.read_bytes()
        after_enum = ENUMS.read_bytes()
        # write back original if we want immutable check — actually generate should be idempotent
        if after_gen != before_gen or after_enum != before_enum:
            # restore committed and fail
            GENERATED.write_bytes(before_gen)
            ENUMS.write_bytes(before_enum)
            raise BlockingFailure(
                "generated TTL/enums drift from generate_ontology.py — regenerate and commit"
            )

    # Snapshot verify via extract
    r2 = subprocess.run(
        [sys.executable, str(SCRIPTS / "extract_domain_snapshot.py")],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if r2.returncode != 0:
        raise BlockingFailure(f"extract_domain_snapshot.py failed:\n{r2.stderr}")

    print("Gate 1 OK")


def gate2_shacl() -> None:
    print("=== Gate 2: SHACL instances ===")
    r = subprocess.run(
        [sys.executable, str(SCRIPTS / "validate_instances.py")],
        cwd=str(ROOT),
    )
    if r.returncode != 0:
        raise BlockingFailure("SHACL instance validation failed")
    print("Gate 2 OK")


def gate3_owl() -> None:
    print("=== Gate 3: OWL-RL TBox ===")
    r = subprocess.run(
        [sys.executable, str(SCRIPTS / "validate_owl.py")],
        cwd=str(ROOT),
    )
    if r.returncode != 0:
        raise BlockingFailure("OWL-RL validation failed")
    print("Gate 3 OK")


def main() -> int:
    try:
        gate1_contract()
        gate2_shacl()
        gate3_owl()
    except BlockingFailure as e:
        print(f"FAIL: {e}", file=sys.stderr)
        return 1
    print("validate_spec: all gates passed (Phase 0)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
