# Spec 001 — Incoming Packing Slip (Live Surface)

**Status:** Binding for the **operable** v2.0 surface.  
**Runtime SoR:** `server.js`, `public/incoming.html`

## Goal

Warehouse operators photograph packing slips, extract a PO reference, confirm project name, attach manufacturer, and upload the image to the AES file service.

## User flow

1. Open `/incoming.html` (from `/` landing).
2. Capture / select photo → `POST /api/extract-po` field `photo`.
3. Verify/edit `projectNumber`, `poSuffix`, `projectName`, `manufacturer` → optional `GET /api/project-name/:projectNumber`.
4. Optional notes in UI (`#notes`) — **known gap: not included in upload FormData**.
5. `POST /api/upload` with `file`, `projectNumber`, `poSuffix`, `projectName`, `manufacturer`.
6. Success resets after ~2s.

## API contracts

### `GET /api/health`

`{ status: 'ok', timestamp: ISO-8601 }`

### `POST /api/extract-po`

- Multipart field: `photo`
- OCR: Tesseract `eng`
- Live PO regex: `/(\d{5})\s*[-\s]\s*(\d{2})/`
- Success: `{ success: true, projectNumber, poSuffix, fullPO, extractedText }`
- Failure: `{ success: false, message, extractedText? }`

### `GET /api/project-name/:projectNumber`

- Proxies `GET {FILE_SERVICE_URL}/api/projects/:projectNumber` with `X-API-Key`
- Returns project name payload from file service (passthrough / mapped per server.js)

### `POST /api/upload`

- Multipart: `file`, `projectNumber`, `poSuffix`, `manufacturer`, optional `projectName`
- Filename live template: `{manufacturer} {projectNumber}-{poSuffix} [{projectName} ]{MM-DD-YYYY}.jpg`
- Forwards to `{FILE_SERVICE_URL}/api/upload` with `fileType=packing_slip`

## Auth

None on live routes (observed). Constitution flags this; MVP may change it later.

## Non-goals (this spec)

- Inventory persistence, flagging, PM email, pallet photos, multi-page sessions
- Anything solely in Spec 002 / `lib/`

## Related

- [data-model.md](./data-model.md)
- [plan.md](./plan.md)
- [tasks.md](./tasks.md)
- [../../ontology/residuals.md](../../ontology/residuals.md)
