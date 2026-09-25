# Ontology Phase 0 — foundation

**Depends on:** Spec Kit baseline  
**Status:** Phase 0 complete (foundation only)

## Goal

Scaffold `log:` ontology with dual-surface TBox, curated axioms, SHACL + enums, domain snapshot, and three-gate `validate_spec.py` smoke.

## Artifacts

- `ontology/logistics_domain.ttl` (+ generated, axioms, shacl, shacl.enums)
- `catalog-v001.xml`, `residuals.md`, `snapshots/domain.snapshot.json`
- `fixtures/phase0-valid.ttl`
- Scripts: extract / generate / ontology_map / validate_* / `run_validate_spec.sh`
- npm script: `validate:spec`

## Gates

```bash
npm run validate:spec
```

Verified 2026-09-25: all three gates passed (Phase 0).

1. Contract (files, markers, MVP TBD, entity map, generate freshness)
2. SHACL fixtures
3. OWL-RL TBox + disjoint markers

## Explicit non-claims

Phases 1–8 are **not** complete. Companion ontologies are not used. `lib/` remains unwired.
