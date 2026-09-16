let client = null;

function initTwilio() {
  try {
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_ACCOUNT_SID.startsWith('AC')) {
      const twilio = require('twilio');
      client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log('Twilio SMS client initialized');
    } else {
      console.warn('Twilio credentials not configured or invalid - SMS disabled');
    }
  } catch (error) {
    console.warn('Twilio initialization failed:', error.message);
  }
}

async function sendSms(toNumber, message) {
  try {
    if (!client) {
      console.warn('Twilio not configured - SMS not sent');
      return { success: false, reason: 'Twilio not configured' };
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
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
