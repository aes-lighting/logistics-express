const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const INVENTORY_FILE = 'inventory.json';
const VALID_LOCATIONS = ['Warehouse A', 'Warehouse B', 'Staging', 'Loading Bay'];

function loadInventory() {
  if (fs.existsSync(INVENTORY_FILE)) {
    const data = fs.readFileSync(INVENTORY_FILE, 'utf8');
    return JSON.parse(data);
  }
  return {};
}

function saveInventory(data) {
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2));
}

function addEntry(entry) {
  const inventory = loadInventory();
  const entryId = uuidv4();

  inventory[entryId] = {
    id: entryId,
    ...entry,
    createdAt: new Date().toISOString(),
    isRemoved: false
  };

  saveInventory(inventory);
  return entryId;
}

function getEntry(entryId) {
  const inventory = loadInventory();
  return inventory[entryId] || null;
}

function listEntries() {
  const inventory = loadInventory();
  return Object.values(inventory).filter(entry => !entry.isRemoved);
}

function markRemoved(entryId) {
  const inventory = loadInventory();
  if (inventory[entryId]) {
    inventory[entryId].isRemoved = true;
    inventory[entryId].removedAt = new Date().toISOString();
    saveInventory(inventory);
  }
}

function markRemovedByJob(jobNumber) {
  const inventory = loadInventory();
  Object.values(inventory).forEach(entry => {
    if (entry.jobNumber === jobNumber) {
      entry.isRemoved = true;
      entry.removedAt = new Date().toISOString();
    }
  });
  saveInventory(inventory);
}

function setQrPdfFilename(entryId, filename) {
  const inventory = loadInventory();
  if (inventory[entryId]) {
    inventory[entryId].qrPdfFilename = filename;
    saveInventory(inventory);
  }
}

function getValidLocations() {
  return VALID_LOCATIONS;
}

module.exports = {
  addEntry,
  getEntry,
  listEntries,
  markRemoved,
  markRemovedByJob,
  setQrPdfFilename,
  getValidLocations,
  loadInventory,
  saveInventory
};
