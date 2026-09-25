# Repo survey — reverse engineering (2026-09-25)

## Live surface

- `server.js`: `/api/health`, `/api/extract-po`, `/api/project-name/:projectNumber`, `/api/upload`
- UI: `public/index.html`, `public/incoming.html`, `public/manifest.json`
- No auth; memory multer; file service persistence

## Deferred `lib/` (unwired at HEAD)

auth, inventory, inventory-report, scheduling, ocr(+patterns), file-naming, file-service-client, emailer, sms, maps, qr-ticket, ticket-render

## Conflicts (see ontology/residuals.md)

Filename convention, file-service upload path, OCR patterns, notes-not-uploaded, hardcoded FILE_SERVICE fallbacks, missing npm deps for lib

## MVP

Undefined — placeholder only (`mvp-definition.md` STATUS: TBD)
