# Information Graph — logistics-express

Narrative entity/relationship map. **Normative** model is the OWL/SHACL package under [ontology/](./ontology/).

## Live graph

```
Project (projectNumber)
  └── PurchaseOrderRef (projectNumber + poSuffix → fullPO)
        └── PackingSlipCapture (photo buffer + OCR text)
              └── FileServiceUpload (manufacturer, filename, fileType=packing_slip)
```

## Deferred graph (lib/)

```
User (email, role) ──manages──► InventoryEntry / Delivery
JobPmDirectory (jobNumber → pmEmail)
InventoryEntry ──locatedAt──► WarehouseLocation
InventoryEntry ──status──► received | flagged | completed | removed/shipped
Delivery ──status──► scheduled → in_progress → completed
Delivery ──notifiedVia──► SMS / Email
InventoryEntry ──mayHave──► QrTicket / DeliveryTicket
```

## Layers

- `LiveSurface` — operable Express + public UI
- `DeferredDomain` — `lib/` conceptualization pending MVP / rewiring
- `PublicIncomingSurface` — currently unauthenticated incoming wizard
- `AuthenticatedAdminSurface` — roles/admin (not live)
