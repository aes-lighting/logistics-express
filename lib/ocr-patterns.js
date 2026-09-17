// OCR patterns for extracting PO and project information from packing slips

const PATTERNS = {
  // Match "PO: 12345-01" or "PO: 12345-01R" or variations
  PO_NUMBER: /PO[:\s]*(\d{5}[-\s]?\d{2,3}[R]?)/i,

  // Alternative patterns to try if the main one doesn't match
  PO_PATTERNS: [
    /PO[:\s]*(\d{5}[-\s]?\d{2,3}[R]?)/i,          // PO: 12345-01
    /PO[#\s]*[\s:]*(\d{5}[-\s]?\d{2,3}[R]?)/i,    // PO# 12345-01
    /project[:\s]*(\d{5}[-\s]?\d{2,3}[R]?)/i,     // Project: 12345-01
  ]
};

// Extract PO number from OCR text
function extractPONumber(ocrText) {
  if (!ocrText) return null;

  // Try each pattern
  for (const pattern of PATTERNS.PO_PATTERNS) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      // Normalize: convert space to dash if needed
      let po = match[1].replace(/\s/g, '-').toUpperCase();

      // Validate format: 5 digits - 2-3 digits [R]
      const normalized = po.match(/^(\d{5})-(\d{2,3}[R]?)$/i);
      if (normalized) {
        return po;
      }
    }
  }

  return null;
}

// Parse PO number into project number and PO suffix
function parsePONumber(poNumber) {
  if (!poNumber) return null;

  const match = poNumber.match(/^(\d{5})-(\d{2,3}[R]?)$/i);
  if (match) {
    return {
      projectNumber: match[1],
      poSuffix: match[2].toUpperCase(),
      fullPO: poNumber.toUpperCase()
    };
  }

  return null;
}

module.exports = {
  PATTERNS,
  extractPONumber,
  parsePONumber
};
