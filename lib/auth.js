const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const AUTH_STORE_PATH = path.join(__dirname, '..', 'auth_store.json');

const VALID_ROLES = ['driver', 'pm', 'admin'];
const EMAIL_DOMAIN = '@aes-energy.com';

function sharedPassword() {
  return process.env.SHARED_PASSWORD || 'aes';
}

function loadStore() {
  if (!fs.existsSync(AUTH_STORE_PATH)) {
    return { users: {} };
  }
  try {
    const data = fs.readFileSync(AUTH_STORE_PATH, 'utf8');
    const store = JSON.parse(data);
    store.users = store.users || {};
    return store;
  } catch (err) {
    console.error('Failed to load auth store:', err);
    return { users: {} };
  }
}

function saveStore(store) {
  try {
    fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Failed to save auth store:', err);
    throw err;
  }
}

// Seed admin account from ADMIN_EMAIL environment variable
function seedAdminFromEnv() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) {
    console.warn('ADMIN_EMAIL not set in environment — no admin account seeded.');
    return;
  }

  const store = loadStore();
  if (!(email in store.users)) {
    store.users[email] = {
      email: email,
      name: 'Admin',
      role: 'admin',
      passwordHash: bcrypt.hashSync(sharedPassword(), 10),
      createdAt: new Date().toISOString()
    };
    saveStore(store);
    console.log(`Seeded initial admin account for ${email}.`);
  } else {
    console.log(`Admin account for ${email} already exists.`);
  }
}

// Register a new user (admin/PM-initiated)
function registerUser(name, email, role) {
  name = (name || '').trim();
  email = (email || '').trim().toLowerCase();
  role = (role || '').trim().toLowerCase();

  if (!name) {
    return { status: 400, body: { error: 'Enter a name.' } };
  }
  if (!email) {
    return { status: 400, body: { error: 'Enter an email.' } };
  }
  if (!email.endsWith(EMAIL_DOMAIN)) {
    return { status: 400, body: { error: `Email must end in ${EMAIL_DOMAIN}.` } };
  }
  if (!VALID_ROLES.includes(role)) {
    return { status: 400, body: { error: `Role must be one of: ${VALID_ROLES.join(', ')}.` } };
  }

  const store = loadStore();
  if (email in store.users) {
    return { status: 409, body: { error: `'${email}' already has an account.` } };
  }

  store.users[email] = {
    email: email,
    name: name,
    role: role,
    passwordHash: bcrypt.hashSync(sharedPassword(), 10),
    createdAt: new Date().toISOString()
  };
  saveStore(store);
  console.log(`Registered ${role} account: ${name} <${email}>`);
  return {
    status: 200,
    body: { status: 'ok', name: name, email: email, role: role }
  };
}

// Login with email and password
function login(email, password) {
  email = (email || '').trim().toLowerCase();
  password = password || '';

  const store = loadStore();
  const record = store.users[email];

  if (!record) {
    return { status: 401, body: { error: 'Incorrect email or password.' } };
  }

  const isValid = bcrypt.compareSync(password, record.passwordHash);
  if (!isValid) {
    return { status: 401, body: { error: 'Incorrect email or password.' } };
  }

  return {
    status: 200,
    body: {
      status: 'ok',
      role: record.role,
      email: record.email,
      name: record.name
    },
    sessionData: {
      role: record.role,
      email: record.email,
      name: record.name
    }
  };
}

// List all users
function listUsers() {
  const store = loadStore();
  return Object.values(store.users)
    .map(rec => ({
      name: rec.name,
      email: rec.email,
      role: rec.role,
      createdAt: rec.createdAt
    }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

// Get current session (from request.session)
function currentSession(sessionData) {
  const role = sessionData?.role;
  if (!role || !VALID_ROLES.includes(role)) {
    return null;
  }
  return {
    role: sessionData.role,
    email: sessionData.email,
    name: sessionData.name
  };
}

// Middleware: Check if user is logged in
function loginRequired(req, res, next) {
  if (!currentSession(req.session)) {
    return res.status(401).json({ error: 'Login required.' });
  }
  next();
}

// Middleware: Check if user is admin
function adminRequired(req, res, next) {
  if (req.session?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin login required.' });
  }
  next();
}

// Middleware: Check if user is PM or admin
function pmOrAdminRequired(req, res, next) {
  const role = req.session?.role;
  if (role !== 'pm' && role !== 'admin') {
    return res.status(403).json({ error: 'PM or admin login required.' });
  }
  next();
}

module.exports = {
  sharedPassword,
  loadStore,
  saveStore,
  seedAdminFromEnv,
  registerUser,
  login,
  listUsers,
  currentSession,
  loginRequired,
  adminRequired,
  pmOrAdminRequired,
  VALID_ROLES,
  EMAIL_DOMAIN
};
