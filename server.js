const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const { Readable } = require('stream');
const ocr = require('./lib/ocr');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configuration
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://file-service.railway.internal:3000';
const FILE_SERVICE_API_KEY = process.env.FILE_SERVICE_API_KEY || 'yvgDtDvqWY2L8A5gb8k4btePZRW20b9m3ur0vgpinZDoF1pcqgjwmhofS8Z0Yxfb';
const PORT = process.env.PORT || 5000;

console.log(`FILE_SERVICE_URL: ${FILE_SERVICE_URL}`);

// Serve static files
app.use(express.static('public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'aes-logistics-express' });
});

// Helper: Get today's date as string (MM-DD-YYYY)
function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  return `${month}-${day}-${year}`;
}

// Endpoint 1: Extract PO number from image using OCR
app.post('/api/extract-po', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Create a temporary buffer for OCR
    const tempPath = `/tmp/ocr_${Date.now()}.jpg`;
    const fs = require('fs');
    fs.writeFileSync(tempPath, req.file.buffer);

    // Run OCR
    const ocrResult = await ocr.extractPOFromImage(tempPath);

    // Clean up
    try { fs.unlinkSync(tempPath); } catch(e) {}

    res.json({
      success: ocrResult.success,
      projectNumber: ocrResult.projectNumber,
      poSuffix: ocrResult.poSuffix,
      fullPO: ocrResult.fullPO,
      message: ocrResult.success ? 'PO extracted' : 'Could not extract PO'
    });
  } catch (error) {
    console.error('OCR error:', error.message);
    res.status(500).json({
      error: 'OCR failed',
      details: error.message
    });
  }
});

// Endpoint 2: Get project name from file service
app.get('/api/project-name/:projectNumber', async (req, res) => {
  try {
    const { projectNumber } = req.params;

    if (!projectNumber) {
      return res.status(400).json({ error: 'Project number required' });
    }

    const response = await axios.get(`${FILE_SERVICE_URL}/api/projects/${projectNumber}`, {
      headers: {
        'X-API-Key': FILE_SERVICE_API_KEY
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
    res.status(500).json({
      error: 'Project lookup failed',
      details: error.message
    });
  }
});

// Endpoint 3: Upload packing slip with proper filename
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { projectNumber, poSuffix, projectName } = req.body;

    if (!projectNumber || !poSuffix) {
      return res.status(400).json({ error: 'Missing projectNumber or poSuffix' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const poNumber = `${projectNumber}-${poSuffix}`;
    const today = getTodayDate();

    // Generate filename: ProjectNum-POSuffix ProjectName - Date.jpg
    const filename = projectName
      ? `${projectNumber}-${poSuffix} ${projectName} - ${today}.jpg`
      : `${projectNumber}-${poSuffix} - ${today}.jpg`;

    console.log(`Uploading file: ${filename} for PO: ${poNumber}`);

    // Prepare multipart form data for file service
    const formData = new FormData();
    const stream = Readable.from(req.file.buffer);
    formData.append('file', stream, filename);
    formData.append('po_number', poNumber);

    // Forward to AES file service
    const response = await axios.post(
      `${FILE_SERVICE_URL}/api/upload/packing-slip`,
      formData,
      {
        headers: {
          'X-API-Key': FILE_SERVICE_API_KEY,
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );

    console.log(`Upload successful for PO ${poNumber}`);
    res.json({
      success: true,
      filename: filename,
      poNumber: poNumber,
      projectNumber: projectNumber,
      projectName: projectName || null,
      ...response.data
    });

  } catch (error) {
    console.error('Upload error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: 'File service error',
        details: error.response.data?.error || error.message
      });
    }

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'File service unavailable',
        details: `Cannot connect to ${FILE_SERVICE_URL}`
      });
    }

    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`AES Logistics Express server listening on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to upload packing slips`);
});
