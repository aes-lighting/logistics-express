const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const inventory = require('./lib/inventory');
const scheduling = require('./lib/scheduling');
const emailer = require('./lib/emailer');
const ocr = require('./lib/ocr');
const qrTicket = require('./lib/qr-ticket');
const ticketRender = require('./lib/ticket-render');
const maps = require('./lib/maps');
const sms = require('./lib/sms');
const inventoryReport = require('./lib/inventory-report');
const fileService = require('./lib/file-service-client');
const fileNaming = require('./lib/file-naming');
const ocrPatterns = require('./lib/ocr-patterns');

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

// Ensure upload directories exist
const uploadDirs = ['incoming', 'organized', 'uploads', 'public'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors({
  credentials: true,
  origin: function(origin, callback) {
    callback(null, true);
  }
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Session middleware
app.use(session({
  secret: process.env.FLASK_SECRET_KEY || 'dev-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.ENABLE_SECURE_COOKIES === 'true',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Static files
app.use(express.static('public'));
app.use('/driver_app', express.static('public/driver_app'));
app.use('/pm_portal', express.static('public/pm_portal'));

// Auth middleware
const loginRequired = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

const pmOrAdminRequired = (req, res, next) => {
  if (!req.session.user || !['pm', 'admin'].includes(req.session.user.role)) {
    return res.status(403).json({ error: 'PM or Admin access required' });
  }
  next();
};

const adminRequired = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Proxy to auth service
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
      email,
      password
    });

    // Auth service returns user object directly: {email, name, role, user_id}
    if (response.data && response.data.email) {
      req.session.user = {
        email: response.data.email,
        name: response.data.name,
        role: response.data.role,
        user_id: response.data.user_id
      };

      // Explicitly save session
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({ success: true, user: req.session.user });
      });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/auth/me', loginRequired, (req, res) => {
  res.json({ user: req.session.user });
});

app.post('/api/auth/admin/register_user', adminRequired, async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/admin/register_user`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(400).json({ error: error.response?.data?.error || 'Registration failed' });
  }
});

app.get('/api/auth/admin/users', pmOrAdminRequired, async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/admin/users`);
    res.json(response.data);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch users' });
  }
});

// ============================================
// FILE UPLOAD ENDPOINTS
// ============================================

app.post('/api/upload', loginRequired, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    success: true,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size
  });
});

// ============================================
// INCOMING INVENTORY ENDPOINTS
// ============================================


app.post('/api/incoming/scan_page', loginRequired, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const photoPath = req.file.path;

    // TEMPORARILY DISABLED: Extract text and PO number from image
    // const ocrResult = await ocr.extractPOFromImage(photoPath);

    // For testing, skip OCR and just accept the photo
    const ocrResult = {
      success: true,
      poNumber: 'MANUAL_ENTRY',
      text: 'OCR disabled for testing'
    };

    // Initialize session slip data if needed
    if (!req.session.slip) {
      req.session.slip = {
        photos: [],
        poData: []
      };
    }

    // Store photo and PO data in session
    req.session.slip.photos.push(photoPath);
    req.session.slip.poData.push({
      pageNumber: req.session.slip.photos.length,
      ...ocrResult
    });

    res.json({
      success: true,
      pageNumber: req.session.slip.photos.length,
      ocrResult: ocrResult,
      message: 'Photo accepted (OCR disabled for testing)'
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message || 'Scan failed' });
  }
});

app.get('/api/incoming/lookup-project/:projectNumber', loginRequired, async (req, res) => {
  try {
    const { projectNumber } = req.params;
    if (!projectNumber) {
      return res.status(400).json({ error: 'Project number required' });
    }

    const response = await axios.get(`${fileService.FILE_SERVICE_URL}/api/projects/${projectNumber}`, {
      headers: {
        'X-API-Key': process.env.FILE_SERVICE_API_KEY || 'yvgDtDvqWY2L8A5gb8k4btePZRW20b9m3ur0vgpinZDoF1pcqgjwmhofS8Z0Yxfb'
      },
      timeout: 5000
    });

    if (response.data && response.data.projectName) {
      res.json({ projectName: response.data.projectName });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error) {
    console.warn(`Project lookup failed:`, error.message);
    res.status(500).json({ error: 'Could not look up project' });
  }
});

app.post('/api/incoming/confirm_job', loginRequired, async (req, res) => {
  try {
    const { projectNumber, poSuffix, projectName } = req.body;

    if (!req.session.slip || !req.session.slip.photos || req.session.slip.photos.length === 0) {
      return res.status(400).json({ error: 'No slip data in session' });
    }

    if (!projectNumber || !poSuffix) {
      return res.status(400).json({ error: 'Project number and PO suffix are required' });
    }

    // Format PO number for file service
    const poNumber = `${projectNumber}-${poSuffix}`;

    // Look up project name from file service if not provided
    let finalProjectName = projectName;
    if (!finalProjectName) {
      try {
        const response = await axios.get(`${fileService.FILE_SERVICE_URL}/api/projects/${projectNumber}`, {
          headers: {
            'X-API-Key': process.env.FILE_SERVICE_API_KEY || 'yvgDtDvqWY2L8A5gb8k4btePZRW20b9m3ur0vgpinZDoF1pcqgjwmhofS8Z0Yxfb'
          },
          timeout: 5000
        });
        if (response.data && response.data.projectName) {
          finalProjectName = response.data.projectName;
        }
      } catch (err) {
        console.warn(`Failed to look up project name from file service:`, err.message);
      }
    }

    if (!finalProjectName) {
      return res.status(400).json({ error: 'Project name could not be determined. Please provide it or check the project number.' });
    }

    // Generate filename with proper naming convention using the correct project name
    const filename = fileNaming.generatePackingSlipFilename(projectNumber, poSuffix, finalProjectName);

    // Upload photos to file service
    const uploadedPaths = [];

    for (let i = 0; i < req.session.slip.photos.length; i++) {
      const photoPath = req.session.slip.photos[i];
      const extension = path.extname(photoPath);
      const uploadFilename = i === 0 ? filename : `${filename.replace('.jpg', '')}_page_${i + 1}${extension}`;

      try {
        const fileBuffer = fs.readFileSync(photoPath);
        const uploadResult = await fileService.uploadFile(
          uploadFilename,
          fileBuffer,
          poNumber
        );

        if (uploadResult) {
          console.log(`File uploaded successfully: ${uploadFilename}`, uploadResult);
          uploadedPaths.push(uploadResult.file || uploadFilename);
        } else {
          console.warn(`File upload returned null for ${uploadFilename}, continuing...`);
          uploadedPaths.push(uploadFilename);
        }
      } catch (err) {
        console.error(`Failed to upload photo ${uploadFilename}:`, err);
        uploadedPaths.push(uploadFilename);
      }
    }

    // Create inventory entry with final project name
    const entryId = inventory.addEntry({
      projectNumber: projectNumber,
      poSuffix: poSuffix,
      fullPO: poNumber,
      projectName: finalProjectName,
      scannedBy: req.session.user.email,
      status: 'received',
      confirmedAt: new Date().toISOString()
    });

    // Update inventory entry with uploaded file paths
    inventory.updateEntry(entryId, {
      slipPhotoFilenames: uploadedPaths
    });

    // Clear session slip after confirmation
    req.session.slip = null;

    res.json({
      success: true,
      entryId: entryId,
      fullPO: poNumber,
      filename: filename,
      projectName: finalProjectName,
      savedPhotos: uploadedPaths,
      message: 'Packing slip uploaded to file service'
    });
  } catch (error) {
    console.error('Confirm job error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incoming/pallet_photo', loginRequired, upload.single('photo'), (req, res) => {
  try {
    if (!req.file || !req.session.slip) {
      return res.status(400).json({ error: 'Missing photo or slip data' });
    }

    if (!req.session.slip.palletPhotos) {
      req.session.slip.palletPhotos = [];
    }

    req.session.slip.palletPhotos.push(req.file.path);

    res.json({
      success: true,
      photoCount: req.session.slip.palletPhotos.length,
      message: 'Pallet photo recorded'
    });
  } catch (error) {
    console.error('Pallet photo error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incoming/finalize', loginRequired, async (req, res) => {
  try {
    const { entryId, location, comment } = req.body;

    if (!entryId) {
      return res.status(400).json({ error: 'Entry ID required' });
    }

    // Get existing entry
    const entry = inventory.getEntry(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Copy pallet photos if provided
    const palletPhotoPaths = [];
    if (req.session.slip && req.session.slip.palletPhotos) {
      const projectFolder = fileNaming.generateOrganizedFolderPath(entry.projectNumber);

      req.session.slip.palletPhotos.forEach((photoPath, index) => {
        const palletFilename = `pallet_${index + 1}.jpg`;
        const newPath = path.join(projectFolder, palletFilename);

        try {
          fs.copyFileSync(photoPath, newPath);
          palletPhotoPaths.push(newPath);
        } catch (err) {
          console.error(`Failed to copy pallet photo:`, err);
        }
      });
    }

    // Update entry with finalization details
    const updatedEntry = inventory.updateEntry(entryId, {
      location: location || 'Warehouse',
      palletPhotos: palletPhotoPaths,
      palletCount: palletPhotoPaths.length,
      comment: comment,
      finalizedAt: new Date().toISOString(),
      status: 'completed'
    });

    // Clear session slip
    req.session.slip = null;

    res.json({
      success: true,
      entryId: entryId,
      entry: updatedEntry,
      message: 'Packing slip finalized and stored'
    });
  } catch (error) {
    console.error('Finalize error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incoming/flag', loginRequired, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!req.session.slip || !req.session.slip.photos || req.session.slip.photos.length === 0) {
      return res.status(400).json({ error: 'No slip data to flag' });
    }

    // Create flagged folder
    const flaggedFolder = path.join('organized', 'flagged_packing_slips');
    if (!fs.existsSync(flaggedFolder)) {
      fs.mkdirSync(flaggedFolder, { recursive: true });
    }

    // Move photos to flagged folder
    const flaggedPhotoPaths = [];
    req.session.slip.photos.forEach((photoPath, index) => {
      const filename = `flagged_${Date.now()}_${index + 1}.jpg`;
      const newPath = path.join(flaggedFolder, filename);

      try {
        fs.copyFileSync(photoPath, newPath);
        flaggedPhotoPaths.push(newPath);
      } catch (err) {
        console.error(`Failed to move photo to flagged folder:`, err);
      }
    });

    // Create flagged entry for tracking
    const entryId = inventory.addEntry({
      status: 'flagged',
      reason: reason || 'OCR could not extract PO number',
      flaggedBy: req.session.user.email,
      slipPhotoFilenames: flaggedPhotoPaths,
      flaggedAt: new Date().toISOString()
    });

    // Clear session
    req.session.slip = null;

    res.json({
      success: true,
      entryId: entryId,
      message: 'Packing slip flagged for manual review - email notification will be sent when configured',
      flaggedPhotos: flaggedPhotoPaths
    });
  } catch (error) {
    console.error('Flag error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVENTORY ENDPOINTS
// ============================================

app.get('/api/inventory', loginRequired, (req, res) => {
  try {
    const entries = inventory.listEntries();
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/:entryId', loginRequired, (req, res) => {
  try {
    const entry = inventory.getEntry(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ entry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/:entryId/qr_pdf', loginRequired, (req, res) => {
  try {
    const entry = inventory.getEntry(req.params.entryId);
    if (!entry || !entry.qrPdfFilename) {
      return res.status(404).json({ error: 'QR PDF not found' });
    }

    const pdfPath = path.join('organized', entry.jobNumber, entry.qrPdfFilename);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    res.download(pdfPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/:entryId/remove', loginRequired, (req, res) => {
  try {
    inventory.markRemoved(req.params.entryId);
    res.json({ success: true, message: 'Entry marked as shipped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/locations', (req, res) => {
  res.json({ locations: inventory.getValidLocations() });
});

app.get('/api/inventory/export', pmOrAdminRequired, (req, res) => {
  try {
    const entries = inventory.listEntries();
    const filename = `inventory_${Date.now()}.xlsx`;
    const filepath = path.join('organized', filename);

    inventoryReport.generateReport(entries, filepath);
    res.download(filepath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/pms', (req, res) => {
  try {
    const pms = ['John Doe', 'Jane Smith', 'Bob Johnson'];
    res.json({ pms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHEDULING ENDPOINTS
// ============================================

app.get('/api/schedule', loginRequired, (req, res) => {
  try {
    const deliveries = scheduling.listDeliveries();
    res.json({ deliveries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/schedule', pmOrAdminRequired, async (req, res) => {
  try {
    const { destination, driverName, items, scheduledDate } = req.body;

    const delivery = {
      destination,
      driverName,
      items,
      scheduledDate,
      status: 'scheduled'
    };

    const deliveryId = scheduling.createDelivery(delivery);

    // Calculate ETA if possible
    if (destination && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const eta = await maps.getEta('Warehouse', destination);
        scheduling.updateDelivery(deliveryId, { eta });
      } catch (err) {
        console.warn('ETA calculation failed:', err.message);
      }
    }

    res.json({ success: true, deliveryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/schedule/calendar/settings', pmOrAdminRequired, (req, res) => {
  try {
    const settings = scheduling.getCalendarSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/schedule/calendar/settings', pmOrAdminRequired, (req, res) => {
  try {
    const { calendarUrl } = req.body;
    scheduling.setCalendarSettings({ calendarUrl });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  console.log(`AES Logistics Express server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Auth service: ${AUTH_SERVICE_URL}`);
});
