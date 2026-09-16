const Tesseract = require('tesseract.js');
const fs = require('fs');

async function extractText(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const result = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: m => console.log('OCR Progress:', m.progress)
      }
    );

    const text = result.data.text;

    if (!text || text.trim().length === 0) {
      console.warn(`OCR extracted empty text from ${imagePath}`);
      return '(No text found in image)';
    }

    return text.trim();
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

async function extractTextBatch(imagePaths) {
  const results = [];

  for (const imagePath of imagePaths) {
    try {
      const text = await extractText(imagePath);
      results.push({
        imagePath,
        text,
        success: true
      });
    } catch (error) {
      results.push({
        imagePath,
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

module.exports = {
  extractText,
  extractTextBatch
};
