const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Tesseract.js for OCR
const Tesseract = require('tesseract.js');

// Multer with memory storage (no disk persistence)
const upload = multer({ storage: multer.memoryStorage() });

// Helper to get today's date in MM-DD-YYYY format
function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}-${day}-${year}`;
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// OCR EXTRACTION ENDPOINT
// ============================================

app.post('/api/extract-po', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo provided' });
    }

    // Convert buffer to base64 for Tesseract
    const imageData = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${imageData}`;

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');

    // Extract project number and PO suffix using regex
    // Looking for patterns like "25066-99" or "25066 99"
    const poMatch = text.match(/(\d{5})\s*[-\s]\s*(\d{2})/);

    if (poMatch) {
      const projectNumber = poMatch[1];
      const poSuffix = poMatch[2];
      const fullPO = `${projectNumber}-${poSuffix}`;

      res.json({
        success: true,
        projectNumber,
        poSuffix,
        fullPO,
        extractedText: text
      });
    } else {
      res.json({
        success: false,
        message: 'Could not extract PO number from image',
        extractedText: text
      });
    }
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// PROJECT NAME LOOKUP ENDPOINT
// ============================================

app.get('/api/project-name/:projectNumber', async (req, res) => {
  try {
    const { projectNumber } = req.params;

    if (!projectNumber) {
      return res.status(400).json({ error: 'Project number required' });
    }

    // Query file service for project name
    const fileServiceUrl = process.env.FILE_SERVICE_URL || 'http://file-service.railway.internal:3000';
    const apiKey = process.env.FILE_SERVICE_API_KEY || 'yvgDtDvqWY2L8A5gb8k4btePZRW20b9m3ur0vgpinZDoF1pcqgjwmhofS8Z0Yxfb';

    const response = await axios.get(`${fileServiceUrl}/api/projects/${projectNumber}`, {
      headers: {
        'X-API-Key': apiKey
      },
      timeout: 5000
    });

    if (response.data && response.data.projectName) {
      res.json({ projectName: response.data.projectName });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error) {
    console.error('Project lookup error:', error.message);
    res.status(500).json({ error: 'Could not look up project name' });
  }
});

// ============================================
// UPLOAD ENDPOINT
// ============================================

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { projectNumber, poSuffix, projectName } = req.body;

    if (!projectNumber || !poSuffix) {
      return res.status(400).json({ error: 'Project number and PO suffix required' });
    }

    // Generate filename with proper naming convention
    const today = getTodayDate();
    const filename = projectName
      ? `${projectNumber}-${poSuffix} ${projectName} - ${today}.jpg`
      : `${projectNumber}-${poSuffix} - ${today}.jpg`;

    // Upload to file service
    const fileServiceUrl = process.env.FILE_SERVICE_URL || 'http://file-service.railway.internal:3000';
    const apiKey = process.env.FILE_SERVICE_API_KEY || 'yvgDtDvqWY2L8A5gb8k4btePZRW20b9m3ur0vgpinZDoF1pcqgjwmhofS8Z0Yxfb';

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: filename,
      contentType: req.file.mimetype
    });
    formData.append('poNumber', `${projectNumber}-${poSuffix}`);

    const uploadResponse = await axios.post(
      `${fileServiceUrl}/api/upload/packing-slip`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': apiKey
        },
        timeout: 30000
      }
    );

    if (uploadResponse.data && uploadResponse.data.success) {
      res.json({
        success: true,
        filename: filename,
        poNumber: `${projectNumber}-${poSuffix}`,
        message: 'File uploaded successfully to file service'
      });
    } else {
      res.status(500).json({
        error: 'Upload failed',
        details: uploadResponse.data?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`AES Logistics Express v2.0 server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
