const nodemailer = require('nodemailer');

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_USE_TLS === 'true' || false,
  auth: {
    user: process.env.SMTP_USERNAME || 'your-email@example.com',
    pass: process.env.SMTP_PASSWORD || 'your-password'
  }
});

async function sendIncomingNotification(pmEmail, jobNumber, extractedPages) {
  try {
    const htmlBody = `
      <h2>New Incoming Inventory</h2>
      <p>Job Number: <strong>${jobNumber}</strong></p>
      <p>Pages scanned: <strong>${extractedPages.length}</strong></p>
      <h3>Extracted Text:</h3>
      <pre>${extractedPages.map((page, i) => `Page ${i + 1}:\n${page}`).join('\n\n')}</pre>
      <p><a href="${process.env.PUBLIC_BASE_URL}/pm_portal">View in PM Portal</a></p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@aes-energy.com',
      to: pmEmail,
      subject: `New Incoming Inventory - Job ${jobNumber}`,
      html: htmlBody
    });

    console.log(`Email sent to ${pmEmail} for job ${jobNumber}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

async function sendFlagEmail(pmEmail, jobNumber, reason, attachments = []) {
  try {
    const htmlBody = `
      <h2>Packing Slip Flagged for Review</h2>
      <p>Job Number: <strong>${jobNumber}</strong></p>
      <p>Reason: <strong>${reason}</strong></p>
      <p>Please review the attached images and confirm the job number or correct it as needed.</p>
      <p><a href="${process.env.PUBLIC_BASE_URL}/pm_portal">View in PM Portal</a></p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@aes-energy.com',
      to: pmEmail,
      subject: `Action Required: Packing Slip Review - Job ${jobNumber}`,
      html: htmlBody,
      attachments: attachments
    });

    console.log(`Flag email sent to ${pmEmail} for job ${jobNumber}`);
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

async function sendDeliveryAlert(email, deliveryInfo) {
  try {
    const htmlBody = `
      <h2>Delivery Alert</h2>
      <p>Driver: <strong>${deliveryInfo.driverName}</strong></p>
      <p>Destination: <strong>${deliveryInfo.destination}</strong></p>
      <p>Status: <strong>${deliveryInfo.status}</strong></p>
      <p><a href="${process.env.PUBLIC_BASE_URL}/pm_portal">Track Delivery</a></p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@aes-energy.com',
      to: email,
      subject: `Delivery Update: ${deliveryInfo.destination}`,
      html: htmlBody
    });
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

module.exports = {
  sendIncomingNotification,
  sendFlagEmail,
  sendDeliveryAlert
};
