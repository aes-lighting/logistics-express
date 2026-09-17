const Tesseract = require('tesseract.js');
const ocrPatterns = require('./ocr-patterns');

// Extract text from image using Tesseract
async function extractText(imagePath) {
  try {
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log('OCR progress:', m.status, m.progress)
    });

    const text = result.data.text;

    if (!text || text.trim() === '') {
      console.warn('No text found in image:', imagePath);
      return '(No text found in image)';
    }

    return text;
  } catch (error) {
    console.error('OCR extraction error:', error.message);
    throw error;
  }
}

// Extract PO number from image
async function extractPOFromImage(imagePath) {
  try {
    const ocrText = await extractText(imagePath);
    const poNumber = ocrPatterns.extractPONumber(ocrText);
    const parsed = poNumber ? ocrPatterns.parsePONumber(poNumber) : null;

    return {
      rawText: ocrText,
      poNumber: poNumber,
      projectNumber: parsed ? parsed.projectNumber : null,
      poSuffix: parsed ? parsed.poSuffix : null,
      fullPO: parsed ? parsed.fullPO : null,
      success: !!parsed
    };
  } catch (error) {
    console.error('PO extraction error:', error.message);
    return {
      error: error.message,
      success: false
    };
  }
}

// Batch extract text from multiple images
async function extractTextBatch(imagePaths) {
  const results = [];

  for (const path of imagePaths) {
    try {
      const text = await extractText(path);
      results.push({ path, text, success: true });
    } catch (error) {
      console.error(`Failed to extract from ${path}:`, error.message);
      results.push({ path, error: error.message, success: false });
    }
  }

  return results;
}

module.exports = {
  extractText,
  extractPOFromImage,
  extractTextBatch
};
