# logistics-express Constitution

## Principles

1. Evidence before implementation.
2. Dual-surface honesty: document Live Surface and Deferred Domain separately; never conflate them.
3. Secrets must stay outside Git. No hardcoded API keys, shared passwords, or service credentials in source.
4. No production feature is complete without tests (when runtime behavior changes).
5. Domain-affecting entity/status/enum changes must update `.specify/spec.md` + `.specify/ontology/` and pass `validate_spec.py` in the same change set.
6. OCR, filename, and file-service contract drift must be resolved by explicit owner/agent decision recorded in evidence — not silent “cleanup.”
7. Do not invent live routes from unwired `lib/` modules (`PolicyNoInventLiveRoutesFromLib`).
8. Do not promote Spec 002 (deferred platform) into operable surface without MVP definition update + wiring plan.
9. MVP remains incomplete until the owner fills `mvp-definition.md`; agents must not declare MVP done.
10. Each phase must produce evidence suitable for future agent memory under `.specify/evidence/`.
11. Prefer wiring or deliberately archiving deferred `lib/` over leaving contradictory dead code undocumented.

## Required Validation

Every implementation phase must record:

- Git status before and after
- Tests / `npm run validate:spec` run and output
- Files changed
- Security impact (esp. secrets, auth, upload)
- Live-vs-deferred impact
- User-facing behavior changed
- Remaining risks

## Production Definition

Production readiness is **not** defined here. See [mvp-definition.md](../mvp-definition.md) (**STATUS: TBD**). Until that document is owner-updated, treat current HEAD as an observed live packing-slip tool plus deferred domain backlog — not a closed MVP.
