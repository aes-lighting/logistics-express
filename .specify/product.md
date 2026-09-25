# Product — AES Logistics Express

**AES Logistics Express** is a warehouse-oriented tool for AES Energy lighting logistics: capture packing-slip photos, OCR a purchase-order reference, confirm project identity, and upload the slip to the shared file service.

## Brand

- Product name: **AES Logistics** / **AES Logistics Express**
- Org context: AES Energy / aes-lighting
- Auth email domain (deferred): `@aes-energy.com`

## Surfaces

| Surface | Status |
|---------|--------|
| Incoming packing-slip wizard (`/incoming.html`) | **Live (v2.0)** |
| Health + OCR + project lookup + upload APIs | **Live** |
| Inventory lifecycle, PM portal, driver app, scheduling, SMS/email | **Deferred** (encoded in `lib/`, not wired) |

## Version posture

HEAD ships as **v2.0.0** slim incoming capture. A richer Phase-1 platform remains in `lib/` as reverse-engineered deferred domain. **MVP acceptance is not defined** — see [mvp-definition.md](./mvp-definition.md).
