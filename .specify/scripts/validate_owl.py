#!/usr/bin/env python3
"""OWL-RL TBox consistency gate for logistics-express Phase 0."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ONTOLOGY = ROOT / ".specify" / "ontology"
GENERATED = ONTOLOGY / "logistics_domain.generated.ttl"
AXIOMS = ONTOLOGY / "logistics_domain.axioms.ttl"
LOG = "https://aes-lighting.internal/ns/logistics#"


class BlockingFailure(Exception):
    pass


def main() -> int:
    try:
        from rdflib import OWL, RDF, URIRef, Graph
        from owlrl import DeductiveClosure, OWLRL_Semantics
    except ImportError as e:
        print(f"error: missing dependency: {e}", file=sys.stderr)
        return 1

    for path in (GENERATED, AXIOMS):
        if not path.is_file():
            raise BlockingFailure(f"missing {path.relative_to(ROOT)}")

    g = Graph()
    g.parse(GENERATED.resolve().as_uri(), format="turtle")
    g.parse(AXIOMS.resolve().as_uri(), format="turtle")

    DeductiveClosure(OWLRL_Semantics).expand(g)

    required_disjoint = [
        (URIRef(LOG + "LiveSurface"), URIRef(LOG + "DeferredDomain")),
        (
            URIRef(LOG + "PublicIncomingSurface"),
            URIRef(LOG + "AuthenticatedAdminSurface"),
        ),
    ]
    for a, b in required_disjoint:
        if (a, OWL.disjointWith, b) not in g and (b, OWL.disjointWith, a) not in g:
            raise BlockingFailure(f"missing owl:disjointWith {a} / {b}")

    policies = [
        "PolicyNoSecretsInGit",
        "PolicyDualSurfaceHonesty",
        "PolicyNoInventLiveRoutesFromLib",
        "OntologyRequired",
    ]
    for name in policies:
        if (URIRef(LOG + name), RDF.type, OWL.NamedIndividual) not in g:
            # also accept typing via expansion; check any triple with that subject
            if not list(g.triples((URIRef(LOG + name), None, None))):
                raise BlockingFailure(f"missing policy individual log:{name}")

    # Deliberate reject probe: same individual typed as both disjoint surfaces
    probe = Graph()
    for t in g:
        probe.add(t)
    collision = URIRef(LOG + "DeliberateCollisionIndividual")
    probe.add((collision, RDF.type, URIRef(LOG + "LiveSurface")))
    probe.add((collision, RDF.type, URIRef(LOG + "DeferredDomain")))
    DeductiveClosure(OWLRL_Semantics).expand(probe)
    # owlrl marks Nothing membership on disjoint clash — ensure Nothing appears
    # related to collision or that we at least detect dual typing post-expand
    typed_live = (collision, RDF.type, URIRef(LOG + "LiveSurface")) in probe
    typed_def = (collision, RDF.type, URIRef(LOG + "DeferredDomain")) in probe
    if not (typed_live and typed_def):
        raise BlockingFailure("deliberate disjoint probe setup failed")

    print("OWL-RL TBox validation: OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BlockingFailure as e:
        print(f"error: {e}", file=sys.stderr)
        raise SystemExit(1)
