"""Fail-closed entity → OWL class allow-list for logistics-express Phase 0."""

from __future__ import annotations

ENTITY_TO_CLASS: dict[str, str] = {
    # Live
    "PackingSlipCapture": "PackingSlipCapture",
    "PurchaseOrderRef": "PurchaseOrderRef",
    "Project": "Project",
    "Manufacturer": "Manufacturer",
    "FileServiceUpload": "FileServiceUpload",
    # Deferred
    "User": "User",
    "InventoryEntry": "InventoryEntry",
    "Delivery": "Delivery",
    "JobPmDirectory": "JobPmDirectory",
    "WarehouseLocation": "WarehouseLocation",
    "QrTicket": "QrTicket",
    "DeliveryTicket": "DeliveryTicket",
}

LOG_NS = "https://aes-lighting.internal/ns/logistics#"
