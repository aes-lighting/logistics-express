# Project Context — logistics-express

## Identity

| Field | Value |
|-------|--------|
| Package | `aes-logistics-express` |
| Version | `2.0.0` |
| Description | AES Logistics Management System - Incoming Inventory |
| Org / repo | `aes-lighting/logistics-express` |
| Runtime | Node `18.x` |
| Entry | `server.js` |

## Live stack

- Express static + JSON APIs
- multer memory storage (no disk persistence on live path)
- tesseract.js (eng) for packing-slip OCR
- axios + form-data → external file service
- dotenv

## Live UX

1. `public/index.html` — landing “AES Logistics” → `/incoming.html`
2. `public/incoming.html` — 3-step: Capture Photo → Verify Details → Notes (optional) → Upload
3. `public/manifest.json` — PWA manifest (`start_url: /incoming.html`); not linked from HTML at HEAD

## Module map (`lib/` — **not wired** by `server.js` at HEAD)

| Module | Purpose |
|--------|---------|
| `auth.js` | Local JSON users; roles `driver\|pm\|admin`; `@aes-energy.com` |
| `inventory.js` | `inventory_store.json` CRUD; locations; soft-remove |
| `inventory-report.js` | XLSX reports (needs `xlsx`) |
| `scheduling.js` | `scheduling.json` deliveries + settings |
| `ocr.js` / `ocr-patterns.js` | Richer PO extraction than live inline regex |
| `file-naming.js` | Organized path + filename convention (conflicts with live) |
| `file-service-client.js` | Alternate upload API shape |
| `emailer.js` | SMTP notifications (needs `nodemailer`) |
| `sms.js` | Twilio (needs `twilio`) |
| `maps.js` | Google Distance Matrix / Directions |
| `qr-ticket.js` | QR PDF stub (needs `qrcode`, `pdfkit`) |
| `ticket-render.js` | SVG→PNG ticket stub (needs `sharp`) |

## Environment

### In `.env.example`

`PORT`, `NODE_ENV`, `AUTH_SERVICE_URL`, `FLASK_SECRET_KEY`, `SMTP_*`, `TWILIO_*`, `GOOGLE_MAPS_API_KEY`

### Used in code but missing from `.env.example`

`FILE_SERVICE_URL`, `FILE_SERVICE_API_KEY`, `PUBLIC_BASE_URL`, `SMTP_USE_TLS`, `SHARED_PASSWORD`, `ADMIN_EMAIL`

## Integrations

| System | Status |
|--------|--------|
| File service (projects + upload) | **Live** |
| Tesseract OCR | **Live** |
| Auth service / local auth store | Deferred |
| SMTP / Twilio / Google Maps | Deferred |
