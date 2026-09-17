const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const INVENTORY_STORE_PATH = path.join(__dirname, '..', 'inventory_store.json');

// Load inventory store from JSON
function loadStore() {
  if (!fs.existsSync(INVENTORY_STORE_PATH)) {
    return { entries: {}, job_pm_directory: {} };
  }

  try {
    const data = fs.readFileSync(INVENTORY_STORE_PATH, 'utf8');
    const store = JSON.parse(data);
    store.entries = store.entries || {};
    store.job_pm_directory = store.job_pm_directory || {};
    return store;
  } catch (err) {
    console.error('Failed to load inventory store:', err);
    return { entries: {}, job_pm_directory: {} };
  }
}

// Save inventory store to JSON
function saveStore(store) {
  try {
    fs.writeFileSync(INVENTORY_STORE_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Failed to save inventory store:', err);
    throw err;
  }
}

// Add new inventory entry
function addEntry(entry) {
  const entryId = uuidv4();
  const store = loadStore();

  store.entries[entryId] = {
    id: entryId,
    ...entry,
    createdAt: new Date().toISOString(),
    removed: false,
    removed_at: null,
    removed_reason: null
  };

  // Store job -> PM mapping if PM email provided
  if (entry.jobNumber && entry.pmEmail) {
    store.job_pm_directory[entry.jobNumber] = entry.pmEmail;
  }

  saveStore(store);
  return entryId;
}

// Get entry by ID
function getEntry(entryId) {
  const store = loadStore();
  return store.entries[entryId] || null;
}

// List all entries
function listEntries(filterRemoved = true) {
  const store = loadStore();
  const entries = Object.values(store.entries);

  if (filterRemoved) {
    return entries.filter(e => !e.removed);
  }

  return entries;
}

// Mark entry as removed (shipped)
function markRemoved(entryId, reason = 'shipped') {
  const store = loadStore();

  if (store.entries[entryId]) {
    store.entries[entryId].removed = true;
    store.entries[entryId].removed_at = new Date().toISOString();
    store.entries[entryId].removed_reason = reason;
    saveStore(store);
    return true;
  }

  return false;
}

// Mark entries for a job as removed
function markRemovedByJob(jobNumber, reason = 'shipped') {
  const store = loadStore();
  const entries = Object.values(store.entries).filter(e => e.jobNumber === jobNumber);

  entries.forEach(entry => {
    entry.removed = true;
    entry.removed_at = new Date().toISOString();
    entry.removed_reason = reason;
  });

  saveStore(store);
  return entries.length;
}

// Update entry
function updateEntry(entryId, updates) {
  const store = loadStore();

  if (store.entries[entryId]) {
    store.entries[entryId] = {
      ...store.entries[entryId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveStore(store);
    return store.entries[entryId];
  }

  return null;
}

// Get PM email for a job
function getPMForJob(jobNumber) {
  const store = loadStore();
  return store.job_pm_directory[jobNumber] || null;
}

// Get valid warehouse locations
function getValidLocations() {
  return ['Warehouse', 'Staging', 'Loading Bay', 'Back Tent'];
}

module.exports = {
  loadStore,
  saveStore,
  addEntry,
  getEntry,
  listEntries,
  markRemoved,
  markRemovedByJob,
  updateEntry,
  getPMForJob,
  getValidLocations
};
