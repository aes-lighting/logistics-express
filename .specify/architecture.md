# Architecture — logistics-express

## Live request path

```
Browser (incoming.html)
  → Express static (public/)
  → POST /api/extract-po     (Tesseract in-process)
  → GET  /api/project-name/:n (proxy → FILE_SERVICE_URL)
  → POST /api/upload          (proxy → FILE_SERVICE_URL /api/upload)
```

- Images stay in **memory buffers** (multer memoryStorage); no live local durable inventory record.
- Persistence of packing slips is delegated to the **external file service**.

## Deferred architecture (not operable at HEAD)

- JSON file stores: `inventory_store.json`, `auth_store.json`, `scheduling.json`
- Disk folders (gitignored): `incoming/`, `organized/`, `uploads/`
- Session-based multi-page slip flows (historical Phase-1)
- Notification side-effects: SMTP, Twilio, Maps ETA

## Contract drift (must stay documented)

| Concern | Live `server.js` | Deferred `lib/` |
|---------|------------------|-----------------|
| Upload path | `POST {FS}/api/upload` + `fileType=packing_slip` | `POST {FS}/api/upload/packing-slip` |
| Filename | manufacturer-first, zero-padded `MM-DD-YYYY` | project-first, `M-D-YYYY` |
| OCR | inline `#####-##` | `ocr-patterns.js` richer patterns |

## Stack constraints

- Node 18.x
- No TypeScript at HEAD
- Orphaned deps required by `lib/` are **absent** from current `package.json` (bcrypt, nodemailer, twilio, xlsx, sharp, qrcode, pdfkit, …)

Normative entity model: [ontology/](./ontology/) and Specs 001–002.
