# Spec 002 — Data Model (Deferred)

## User

| Field | Notes |
|-------|--------|
| email | must end `@aes-energy.com` |
| name | string |
| role | `driver` \| `pm` \| `admin` |
| passwordHash | bcrypt |
| createdAt | ISO |

## InventoryEntry

| Field | Notes |
|-------|--------|
| id | uuid |
| jobNumber / project fields | field-name drift vs live `projectNumber` |
| location | closed location vocab |
| status | received / flagged / completed |
| pages / photos / palletCount / notes | Phase-1 rich slip |
| assignedPm / pmEmail | |
| removed, removed_at, removed_reason | soft-delete; default reason `shipped` |
| createdAt, updatedAt | |

## JobPmDirectory

`jobNumber → pmEmail` map inside inventory store.

## Delivery

| Field | Notes |
|-------|--------|
| id | uuid |
| destination, driverName, items | |
| scheduledDate, eta | |
| status | `scheduled` \| `in_progress` \| `completed` |
| startedAt, completedAt | |
| createdAt | |

## WarehouseLocation (individuals)

`Warehouse`, `Staging`, `Loading Bay`, `Back Tent`

## QrTicket / DeliveryTicket

Generated artifacts; implementation stubbed.
