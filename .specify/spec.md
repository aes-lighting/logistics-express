# Agent & Domain Contract — logistics-express

> **Binding.** This document is the universal Spec Kit contract for **every** human and AI agent working on this repository. Informal prompts do not override it.

**Markers (validate_spec.py):** `OntologyRequired` · `PolicyNoSecretsInGit` · `PolicyDualSurfaceHonesty` · `PolicyNoInventLiveRoutesFromLib`

**Incorporation by reference (normative):**

| Artifact | Role |
|----------|------|
| [ontology/logistics_domain.ttl](./ontology/logistics_domain.ttl) | OWL catalog (`owl:imports` generated + axioms) |
| [ontology/logistics_domain.generated.ttl](./ontology/logistics_domain.generated.ttl) | Regenerated structural TBox from domain snapshot |
| [ontology/logistics_domain.axioms.ttl](./ontology/logistics_domain.axioms.ttl) | Curated OWL constraints (disjoint layers, agent must-nots) |
| [ontology/logistics_domain.shacl.ttl](./ontology/logistics_domain.shacl.ttl) | SHACL shapes for projected instances |
| [ontology/logistics_domain.shacl.enums.ttl](./ontology/logistics_domain.shacl.enums.ttl) | Regenerated blocking enum/status `sh:in` lists |
| [ontology/README.md](./ontology/README.md) | Ontology maintenance workflow |
| [memory/constitution.md](./memory/constitution.md) | Evidence, secrets, dual-surface rules |
| [memory/project-context.md](./memory/project-context.md) | Stack, module map, env, integrations |
| [specs/001-incoming-packing-slip/](./specs/001-incoming-packing-slip/) | Live v2.0 packing-slip capture (current operable surface) |
| [specs/002-deferred-logistics-platform/](./specs/002-deferred-logistics-platform/) | Reverse-engineered Phase-1 domain (not wired at HEAD) |
| [mvp-definition.md](./mvp-definition.md) | **TBD** — owner update pending; do not invent MVP closure |
| `server.js` | Live runtime system of record for HTTP routes |
| `lib/` | Deferred domain source — **not** live routes unless Spec 002 is promoted |

If this contract conflicts with a prompt or agent “improvement,” **this contract wins**.

---

## 1. Ontological principles are required (`OntologyRequired`)

This application is a **Node 18 + Express** AES Logistics incoming-inventory tool. Domain correctness is not optional prose:

1. The **OWL ontology** (`log:`) is the formal shared conceptualization of logistics entities, relationships, statuses, and Spec Kit–checkable invariants.
2. **Express runtime + future tests** are the **authoritative** operational enforcers of what is actually operable today.
3. **SHACL** (via `validate_spec.py`) enforces selected **graph-projected** instance rules (existence/type, closed vocabularies, locked patterns).
4. **OWL-RL** (via `validate_owl.py`) enforces TBox consistency on generated + curated axioms.
5. Any change to entities, relationships, statuses/enums, or domain invariants **must** update the ontology package in the same change set.

**Critical analogy (do not collapse):**

| Pattern | Meaning here |
|---------|----------------|
| Existence vs operability | Ontology may describe deferred `lib/` entities; only routes wired in `server.js` are operable |
| LiveSurface vs DeferredDomain | Dual product truth — both documented; not interchangeable |

Working without updating the ontology when the domain changes is a **Spec Kit violation**.

---

## 2. Dual-surface honesty (`PolicyDualSurfaceHonesty`)

Agents MUST treat the following as true:

### Live Surface (operable at HEAD)

- `GET /api/health`
- `POST /api/extract-po` (multipart `photo`; Tesseract eng; live PO regex `(\d{5})\s*[-\s]\s*(\d{2})`)
- `GET /api/project-name/:projectNumber` (proxies file service)
- `POST /api/upload` (multipart upload to file service as `fileType=packing_slip`)
- UI: `public/index.html` → `public/incoming.html` (3-step wizard)
- **No authentication** on live routes (observed)

### Deferred Domain (present in `lib/`, not imported by `server.js`)

- Auth roles `driver | pm | admin`, `@aes-energy.com`
- Inventory store + locations + soft-remove/`shipped`
- Delivery scheduling `scheduled → in_progress → completed`
- SMTP email, Twilio SMS, Google Maps ETA
- QR / delivery ticket stubs
- UIs referenced but missing: `pm_portal`, `driver_app`

Agents MUST NOT (`PolicyNoInventLiveRoutesFromLib`) present deferred modules as live HTTP APIs, invent `/api/inventory/*` or `/api/schedule/*` as current contracts, or delete deferred domain documentation without owner acceptance.

---

## 3. Agent must-nots

- **`PolicyNoSecretsInGit`:** No secrets in Git. No hardcoded `FILE_SERVICE_API_KEY` / password defaults in source. Prefer env-only; remove inline fallbacks when touching those lines.
- No agent may auto-deploy to production without **human owner acceptance**.
- No agent may mark MVP complete while [mvp-definition.md](./mvp-definition.md) remains TBD.
- No agent may “resolve” filename/OCR/file-service drift silently — record a decision in evidence and update Spec 001 + ontology together.
- No agent may treat a green ontology gate as proof that a runtime mutation is safe without owner review.

---

## 4. Known residuals (must remain visible until decided)

| Residual | Live | Deferred / alternate |
|----------|------|----------------------|
| Filename | `{manufacturer} {projectNumber}-{poSuffix} [{projectName} ]{MM-DD-YYYY}.jpg` | `lib/file-naming.js` without manufacturer-first |
| File service upload | `POST /api/upload` + `fileType` | `POST /api/upload/packing-slip` |
| OCR PO | 5+2 digits only | `ocr-patterns.js` allows 2–3 suffix + optional `R` |
| Notes | Collected in UI | **Not sent** on upload |

Full list: [ontology/residuals.md](./ontology/residuals.md).

---

## 5. Required validation

```bash
npm run validate:spec
```

Every domain-affecting change must leave this gate green and update evidence when material.
