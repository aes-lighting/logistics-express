const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const SCHEDULING_FILE = 'scheduling.json';

function loadScheduling() {
  if (fs.existsSync(SCHEDULING_FILE)) {
    const data = fs.readFileSync(SCHEDULING_FILE, 'utf8');
    return JSON.parse(data);
  }
  return { deliveries: {}, settings: {} };
}

function saveScheduling(data) {
  fs.writeFileSync(SCHEDULING_FILE, JSON.stringify(data, null, 2));
}

function listDeliveries() {
  const data = loadScheduling();
  return Object.values(data.deliveries || {});
}

function createDelivery(delivery) {
  const data = loadScheduling();
  const deliveryId = uuidv4();

  if (!data.deliveries) {
    data.deliveries = {};
  }

  data.deliveries[deliveryId] = {
    id: deliveryId,
    ...delivery,
    createdAt: new Date().toISOString(),
    status: delivery.status || 'scheduled'
  };

  saveScheduling(data);
  return deliveryId;
}

function getDelivery(deliveryId) {
  const data = loadScheduling();
  return data.deliveries[deliveryId] || null;
}

function updateDelivery(deliveryId, updates) {
  const data = loadScheduling();

  if (data.deliveries[deliveryId]) {
    data.deliveries[deliveryId] = {
      ...data.deliveries[deliveryId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveScheduling(data);
  }
}

function startDelivery(deliveryId) {
  updateDelivery(deliveryId, {
    status: 'in_progress',
    startedAt: new Date().toISOString()
  });
}

function completeDelivery(deliveryId) {
  updateDelivery(deliveryId, {
    status: 'completed',
    completedAt: new Date().toISOString()
  });
}

function getCalendarSettings() {
  const data = loadScheduling();
  return data.settings || {};
}

function setCalendarSettings(settings) {
  const data = loadScheduling();
  data.settings = {
    ...data.settings,
    ...settings
  };
  saveScheduling(data);
}

module.exports = {
  listDeliveries,
  createDelivery,
  getDelivery,
  updateDelivery,
  startDelivery,
  completeDelivery,
  getCalendarSettings,
  setCalendarSettings
};
