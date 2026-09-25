# Ontology residuals — logistics-express Phase 0

Deliberate open conflicts. Do **not** silently “fix” without owner decision + Spec/ontology update.

| ID | Topic | Live | Alternate | Disposition |
|----|-------|------|-----------|-------------|
| R1 | Filename | manufacturer-first, `MM-DD-YYYY` | `lib/file-naming.js` project-first | Open |
| R2 | File service upload | `POST /api/upload` + `fileType` | `POST /api/upload/packing-slip` | Open |
| R3 | OCR PO | `#####-##` only | `ocr-patterns.js` 2–3 suffix + optional `R` | Open |
| R4 | Notes | UI field | Not sent on upload | Open gap |
| R5 | Secrets | Hardcoded FILE_SERVICE_* fallbacks in server.js | Env-only constitution | Open debt |
| R6 | Auth | None on live routes | `lib/auth.js` / AUTH_SERVICE | Deferred |
| R7 | lib wiring | server.js imports none | Full Phase-1 platform | Deferred Spec 002 |
| R8 | Missing deps | stripped package.json | bcrypt, nodemailer, twilio, … | Deferred |
| R9 | MVP | Undefined | — | TBD mvp-definition.md |

## Won’t-dos (Phase 0)

- Claim ontology Phases 1–8 complete
- Import GAAP / commercial / TADOSF companions
- Rewire `lib/` in this Spec Kit pass
