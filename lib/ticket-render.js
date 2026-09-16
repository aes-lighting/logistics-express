const sharp = require('sharp');
const path = require('path');

async function renderTicketImage(ticketData, outputPath) {
  try {
    // Create a ticket image using Sharp (SVG to PNG conversion)
    // This is a stub - actual implementation would render a full ticket

    const svg = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="600" fill="white" stroke="black" stroke-width="2"/>
        <text x="200" y="50" font-size="24" font-weight="bold" text-anchor="middle">AES Logistics</text>
        <text x="200" y="100" font-size="18" text-anchor="middle">Delivery Ticket</text>
        <line x1="20" y1="120" x2="380" y2="120" stroke="black" stroke-width="1"/>

        <text x="20" y="150" font-size="14" font-weight="bold">Job #:</text>
        <text x="200" y="150" font-size="14">${ticketData.jobNumber || 'N/A'}</text>

        <text x="20" y="190" font-size="14" font-weight="bold">Destination:</text>
        <text x="200" y="190" font-size="14">${ticketData.destination || 'N/A'}</text>

        <text x="20" y="230" font-size="14" font-weight="bold">Driver:</text>
        <text x="200" y="230" font-size="14">${ticketData.driver || 'N/A'}</text>

        <text x="20" y="270" font-size="14" font-weight="bold">ETA:</text>
        <text x="200" y="270" font-size="14">${ticketData.eta || 'N/A'}</text>

        <line x1="20" y1="300" x2="380" y2="300" stroke="black" stroke-width="1"/>

        <text x="20" y="330" font-size="12">Items:</text>
        <text x="20" y="360" font-size="11">${ticketData.items?.join(', ') || 'N/A'}</text>

        <text x="20" y="560" font-size="10">Generated: ${new Date().toLocaleString()}</text>
      </svg>
    `;

    // Convert SVG to PNG
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Ticket render error:', error);
    throw error;
  }
}

module.exports = {
  renderTicketImage
};
