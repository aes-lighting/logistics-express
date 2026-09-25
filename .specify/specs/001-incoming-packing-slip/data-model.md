# Spec 001 — Data Model (Live)

## PurchaseOrderRef

| Field | Type | Rules |
|-------|------|-------|
| projectNumber | string | 5 digits (`^\d{5}$`) live |
| poSuffix | string | 2 digits live (`^\d{2}$`) |
| fullPO | string | `{projectNumber}-{poSuffix}` |

## PackingSlipCapture

| Field | Type | Notes |
|-------|------|-------|
| photo | binary | memory buffer |
| extractedText | string | OCR output |
| manufacturer | string | required for upload |
| projectName | string | optional |
| notes | string | UI-only today; not uploaded |

## FileServiceUpload

| Field | Type | Notes |
|-------|------|-------|
| fileType | enum | `packing_slip` |
| filename | string | live manufacturer-first template |
| destination | external | FILE_SERVICE_URL |

## Project

Identified by `projectNumber`; display name from file service lookup.
