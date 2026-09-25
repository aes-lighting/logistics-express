# Logistics Domain Ontology — logistics-express

Formal OWL/RDFS + SHACL package for AES Logistics Express. **Ontological maintenance is required** for domain changes — see [../spec.md](../spec.md).

**Ontology program status: Phase 0 foundation.** Phases 1–8 are **not** claimed. Further work is maintenance + optional later phases after MVP definition.

## IRI namespace

| Prefix | IRI |
|--------|-----|
| `log:` | `https://aes-lighting.internal/ns/logistics#` |

Open [logistics_domain.ttl](./logistics_domain.ttl) in Protégé.

## Files

| File | Maintainer | Purpose |
|------|------------|---------|
| [logistics_domain.ttl](./logistics_domain.ttl) | Thin catalog | `owl:imports` generated + axioms |
| [logistics_domain.generated.ttl](./logistics_domain.generated.ttl) | Regenerated | Classes, data properties |
| [logistics_domain.axioms.ttl](./logistics_domain.axioms.ttl) | Human | Disjoint layers, agent must-nots |
| [logistics_domain.shacl.ttl](./logistics_domain.shacl.ttl) | Human | Instance shapes |
| [logistics_domain.shacl.enums.ttl](./logistics_domain.shacl.enums.ttl) | Regenerated | Blocking `sh:in` |
| [residuals.md](./residuals.md) | Human | Dual-surface conflicts / won’t-dos |
| [snapshots/](./snapshots/) | Regenerated | Domain extract |

## Neurosymbolic ownership

| Layer | Owns |
|-------|------|
| OWL-RL | TBox consistency |
| SHACL | Existence/type, closed vocab, PO patterns |
| Express + tests | Operable live behavior |
| Agents | Propose changes |
| Human owner | Acceptance, MVP definition, deploy |

## Setup

```bash
pip install -r .specify/scripts/requirements.txt
npm run validate:spec
```
