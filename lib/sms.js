const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

let client = null;

function initTwilio() {
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } else {
    console.warn('Twilio credentials not configured');
  }
}

async function sendSms(toNumber, message) {
  try {
    if (!client) {
      initTwilio();
    }

    if (!client) {
      throw new Error('Twilio not configured');
    }

    const result = await client.messages.create({
      body: message,
      from: TWILIO_FROM_NUMBER,
      to: toNumber
    });

    console.log(`SMS sent to ${toNumber}: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('SMS error:', error.message);
    throw error;
  }
}

async function sendDeliveryNotification(driverPhone, jobNumber, destination) {
  const message = `AES Logistics: Delivery #${jobNumber} to ${destination}. Reply OK when ready.`;
  return sendSms(driverPhone, message);
}

async function sendDeliveryCompleteNotification(pmPhone, jobNumber, driverName) {
  const message = `AES Logistics: Delivery #${jobNumber} completed by ${driverName}. Check portal for photos.`;
  return sendSms(pmPhone, message);
}

// Initialize on module load
initTwilio();

module.exports = {
  sendSms,
  sendDeliveryNotification,
  sendDeliveryCompleteNotification
};
