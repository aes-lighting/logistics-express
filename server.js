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
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Session middleware
app.use(session({
  secret: process.env.FLASK_SECRET_KEY || 'dev-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
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

    // Proxy to auth service
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
      email,
      password
    });

    req.session.user = response.data.user;
    res.json({ success: true, user: response.data.user });
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

    // Extract text from image
    const extractedText = await ocr.extractText(photoPath);

    // Initialize session slip data if needed
    if (!req.session.slip) {
      req.session.slip = {
        pages: [],
        photos: []
      };
    }

    req.session.slip.pages.push(extractedText);
    req.session.slip.photos.push(photoPath);

    res.json({
      success: true,
      pageNumber: req.session.slip.pages.length,
      extractedText: extractedText,
      message: 'Page scanned successfully'
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message || 'Scan failed' });
  }
});

app.post('/api/incoming/confirm_job', loginRequired, (req, res) => {
  try {
    const { jobNumber } = req.body;

    if (!req.session.slip) {
      return res.status(400).json({ error: 'No slip data in session' });
    }

    req.session.slip.jobNumber = jobNumber;

    // Create job folder if it doesn't exist
    const jobFolder = path.join('organized', jobNumber.toString());
    if (!fs.existsSync(jobFolder)) {
      fs.mkdirSync(jobFolder, { recursive: true });
    }

    // Move photos to job folder
    req.session.slip.photos.forEach((photoPath, index) => {
      const newPath = path.join(jobFolder, `page_${index + 1}.jpg`);
      fs.copyFileSync(photoPath, newPath);
    });

    // Email PM about new incoming inventory
    const pmEmail = req.session.user.email || 'pm@example.com';
    emailer.sendIncomingNotification(pmEmail, jobNumber, req.session.slip.pages).catch(err => {
      console.error('Email error:', err);
    });

    res.json({
      success: true,
      jobNumber: jobNumber,
      message: 'Job confirmed and PM notified'
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
    const { location, pm } = req.body;

    if (!req.session.slip) {
      return res.status(400).json({ error: 'No slip data' });
    }

    // Create inventory entry
    const entry = {
      jobNumber: req.session.slip.jobNumber,
      location: location,
      assignedPm: pm,
      status: 'received',
      timestamp: new Date().toISOString(),
      pages: req.session.slip.pages,
      palletCount: req.session.slip.palletPhotos ? req.session.slip.palletPhotos.length : 0
    };

    const entryId = inventory.addEntry(entry);

    // Generate QR PDF
    const pdfFilename = `qr_${entryId}.pdf`;
    // Note: QR PDF generation is stubbed - implement in production
    inventory.setQrPdfFilename(entryId, pdfFilename);

    // Clear session slip
    req.session.slip = null;

    res.json({
      success: true,
      entryId: entryId,
      message: 'Inventory entry created'
    });
  } catch (error) {
    console.error('Finalize error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incoming/flag', loginRequired, upload.single('photo'), async (req, res) => {
  try {
    const { reason, jobNumber } = req.body;

    if (!req.session.slip) {
      return res.status(400).json({ error: 'No slip data' });
    }

    // Send flag email to PM
    const pmEmail = req.session.user.email || 'pm@example.com';
    const attachments = req.session.slip.photos.map(photoPath => ({
      filename: path.basename(photoPath),
      path: photoPath
    }));

    await emailer.sendFlagEmail(pmEmail, jobNumber, reason, attachments);

    // Clear session
    req.session.slip = null;

    res.json({
      success: true,
      message: 'Slip flagged and PM notified'
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
