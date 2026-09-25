# Spec 002 — Deferred Logistics Platform

**Status:** **Deferred / not wired at HEAD.** Reverse-engineered from `lib/*` and historical Phase-1 intent.  
**Must not** be presented as live HTTP contracts until promoted after MVP definition.

## Goal (deferred)

Full AES logistics platform: authenticated roles, incoming inventory lifecycle, delivery scheduling with ETA/SMS/email, QR/tickets, PM portal and driver app.

## Domain summary

### Auth (`lib/auth.js`)

- Roles: `driver`, `pm`, `admin`
- Email must end `@aes-energy.com`
- Store: `auth_store.json`
- Also historically: remote `AUTH_SERVICE_URL`

### Inventory (`lib/inventory.js`)

- Store: `inventory_store.json` → `{ entries, job_pm_directory }`
- Soft-remove with reason default `shipped`
- Locations: `Warehouse`, `Staging`, `Loading Bay`, `Back Tent`
- Status vocabulary (Phase-1 / report): `received`, `flagged`, `completed`, plus removed

### Scheduling (`lib/scheduling.js`)

- Store: `scheduling.json`
- Delivery status: `scheduled` → `in_progress` → `completed`

### Notifications & maps

- `emailer.js` → SMTP; links to `/pm_portal`
- `sms.js` → Twilio
- `maps.js` → Google Distance Matrix / Directions

### Tickets

- `qr-ticket.js`, `ticket-render.js` — stubs / incomplete

### Missing UIs

- `/pm_portal`, `/driver_app` referenced but absent from tree

### Dependency debt

Modules require packages not in current `package.json`: bcrypt, nodemailer, twilio, xlsx, sharp, qrcode, pdfkit, …

## Promotion criteria

1. Owner updates `mvp-definition.md`
2. Explicit wiring plan for `server.js` + deps restore
3. Spec 002 tasks scheduled; ontology DeferredDomain classes marked operable
4. Evidence recorded under `.specify/evidence/`

## Related

- [data-model.md](./data-model.md)
- [plan.md](./plan.md)
- [tasks.md](./tasks.md)
