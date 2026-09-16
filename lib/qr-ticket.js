const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function buildQrPdf(entryId, jobNumber, outputPath) {
  try {
    // Generate QR code data URL
    const qrCode = await QRCode.toDataURL(entryId);

    // Create PDF
    const doc = new PDFDocument({
      size: [215, 279], // A4 in points
      margin: 40
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Add title
    doc.fontSize(16).font('Helvetica-Bold').text('AES Logistics QR Ticket', { align: 'center' });
    doc.moveDown();

    // Add job number
    doc.fontSize(12).font('Helvetica-Bold').text(`Job #: ${jobNumber}`, { align: 'center' });
    doc.moveDown();

    // Add entry ID
    doc.fontSize(10).font('Helvetica').text(`Entry ID: ${entryId}`, { align: 'center' });
    doc.moveDown();

    // Add QR code image (note: will need to use actual image library in production)
    doc.fontSize(10).text('Scan QR Code:', { align: 'center' });
    doc.moveDown();

    // Placeholder for QR code - actual implementation would embed the generated image
    doc.text('[QR Code Image]', {
      align: 'center',
      width: 150,
      height: 150
    });

    doc.moveDown();

    // Add timestamp
    doc.fontSize(9).font('Helvetica-Oblique').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('QR PDF generation error:', error);
    throw error;
  }
}

module.exports = {
  buildQrPdf
};
