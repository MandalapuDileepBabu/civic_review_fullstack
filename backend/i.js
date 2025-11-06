// server.js (CommonJS)
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const fs = require('fs');
// Initialize app
const app = express();
app.use(express.json());
app.use(cors());

// Firebase setup
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();
const fetch = require('node-fetch');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';

// ========================
// 🔹 JWT AUTH MIDDLEWARE
// ========================
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing or invalid token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// ========================
// 🔹 MULTER SETUP (LOCAL STORAGE)
// ========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // folder must exist
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================
// 🔹 ISSUE MANAGEMENT ROUTES
// ========================

// ---------------------------
// SUPERADMIN: default credentials (DEV ONLY)
// ---------------------------
// superadmin credentials (as requested)
const SUPERADMIN_EMAIL = 's@gmail.com';
const SUPERADMIN_PASSWORD = 'superadmin';
const SUPERADMIN_DISPLAYNAME = 'Super Admin';

/**
 * Create default superadmin user in Firebase Auth + Firestore if not exists.
 * WARNING: For production, remove or protect this.
 */
async function ensureSuperadminExists() {
  try {
    // Try to find user by email in Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(SUPERADMIN_EMAIL);
    } catch (e) {
      // not found -> create
      userRecord = null;
    }

    if (!userRecord) {
      console.log('Creating default superadmin in Firebase Auth (DEV ONLY)...');
      const created = await auth.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        displayName: SUPERADMIN_DISPLAYNAME,
      });
      userRecord = created;
    }

    // Ensure Firestore record exists with role 'superadmin'
    const userRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        uid: userRecord.uid,
        name: userRecord.displayName || 'Super Admin',
        email: userRecord.email,
        role: 'superadmin',
        createdAt: admin.firestore.Timestamp.now(),
      });
      console.log('Superadmin Firestore record created.');
    } else {
      // If role not set correctly, update it
      const docRole = userDoc.data().role;
      if (docRole !== 'superadmin') {
        await userRef.update({ role: 'superadmin' });
        console.log('Updated existing user role to superadmin in Firestore.');
      }
    }

    console.log(`Superadmin ready: ${SUPERADMIN_EMAIL}`);
  } catch (err) {
    console.error('Error ensuring superadmin exists:', err);
  }
}

// Call it on startup (DEV only)
ensureSuperadminExists();

// ---------------------------
// SUPERADMIN ROUTES
// ---------------------------

// Middleware to check superadmin role
function requireSuperadmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Forbidden: Superadmin only' });
  next();
}

/**
 * POST /superadmin/create-admin
 * Body: { name, email, password }
 * Creates a Firebase Auth user and sets role = 'admin' in Firestore.
 * Only superadmin can call this.
 */
app.post('/superadmin/create-admin', verifyJWT, requireSuperadmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email, and password required' });

    // Create in Firebase Auth
    const newUser = await auth.createUser({
      displayName: name,
      email,
      password,
    });

    // Save in Firestore with role 'admin'
    await db.collection('users').doc(newUser.uid).set({
      uid: newUser.uid,
      name,
      email,
      role: 'admin',
      createdAt: admin.firestore.Timestamp.now(),
    });

    return res.json({ success: true, uid: newUser.uid, email: newUser.email });
  } catch (err) {
    console.error('superadmin create-admin error', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /superadmin/users
 * Returns all users stored in Firestore (uid, name, email, role)
 * Only accessible to superadmin.
 */
app.get('/superadmin/users', verifyJWT, requireSuperadmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map(d => d.data());
    return res.json({ users });
  } catch (err) {
    console.error('superadmin users error', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /superadmin/dashboard
 * Simple stats: counts of roles
 */
app.get('/superadmin/dashboard', verifyJWT, requireSuperadmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const counts = { superadmin: 0, admin: 0, user: 0, other: 0 };
    snapshot.docs.forEach(doc => {
      const r = doc.data().role || 'other';
      if (counts[r] !== undefined) counts[r] += 1;
      else counts.other += 1;
    });
    return res.json({ stats: counts });
  } catch (err) {
    console.error('superadmin dashboard error', err);
    return res.status(500).json({ error: err.message });
  }
});
// POST /issues (local upload only)
app.post("/issues", verifyJWT, upload.single("image"), async (req, res) => {
  try {
    const { issue_name, location, description } = req.body;

    if (!issue_name || !location || !description)
      return res.status(400).json({ error: "Missing required fields" });

    let imageUrl = null;
    if (req.file) {
      const host = req.get("host");
      const protocol = req.protocol;
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    const newIssue = {
      uid: req.user.uid,
      issue_name,
      location,
      description,
      date: admin.firestore.Timestamp.now(),
      status: "pending",
      image: imageUrl,
    };

    const docRef = await db.collection("issues").add(newIssue);
    return res.json({ issue_id: docRef.id, ...newIssue });
  } catch (err) {
    console.error("Error creating issue:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 GET /issues (admin only)
// ========================
app.get('/issues', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const snapshot = await db.collection('issues').orderBy('date', 'desc').get();
    const host = req.get('host');
    const protocol = req.protocol;

    const issues = snapshot.docs.map(doc => {
      const data = doc.data();
      let dateMs = null;

      if (data.date) {
        if (data.date.toMillis) dateMs = data.date.toMillis(); // Firestore Timestamp
        else dateMs = new Date(data.date).getTime();
      }

      // Ensure image URL is absolute
      let imageUrl = null;
      if (data.image) {
        if (data.image.startsWith('http')) imageUrl = data.image;
        else imageUrl = `${protocol}://${host}/uploads/${path.basename(data.image)}`;
      }

      return {
        issue_id: doc.id,
        issue_name: data.issue_name,
        location: data.location,
        description: data.description,
        date: dateMs,
        status: data.status,
        image: imageUrl,
      };
    });

    return res.json({ issues });
  } catch (err) {
    console.error('get issues error', err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 GET /my-issues
// ========================
app.get('/my-issues', verifyJWT, async (req, res) => {
  try {
    const snapshot = await db.collection('issues')
      .where('uid', '==', req.user.uid)
      .orderBy('date', 'desc')
      .get();

    const host = req.get('host');
    const protocol = req.protocol;

    const issues = snapshot.docs.map(doc => {
      const data = doc.data();
      let dateMs = null;

      if (data.date) {
        if (data.date.toMillis) dateMs = data.date.toMillis(); // Firestore Timestamp
        else dateMs = new Date(data.date).getTime();
      }

      // Ensure image URL is absolute
      let imageUrl = null;
      if (data.image) {
        if (data.image.startsWith('http')) imageUrl = data.image;
        else imageUrl = `${protocol}://${host}/uploads/${path.basename(data.image)}`;
      }

      return {
        issue_id: doc.id,
        issue_name: data.issue_name,
        location: data.location,
        description: data.description,
        date: dateMs,
        status: data.status,
        image: imageUrl,
      };
    });

    return res.json({ issues });
  } catch (err) {
    console.error('get my issues error', err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 PATCH /issues/:issueId/status
// ========================
app.patch('/issues/:issueId/status', verifyJWT, async (req, res) => {
  try {
    const { status } = req.body;
    const issueId = req.params.issueId;

    const issueRef = db.collection('issues').doc(issueId);
    const issueDoc = await issueRef.get();

    if (!issueDoc.exists) 
      return res.status(404).json({ error: 'Issue not found' });

    const issue = issueDoc.data();

    // Check permissions
    if (req.user.role === 'admin') {
      // Admin can set any admin status
      if (!['pending', 'on process', 'solved'].includes(status))
        return res.status(400).json({ error: 'Invalid status for admin' });
    } else if (req.user.role === 'user') {
      // User can only update their own issue
      if (issue.uid !== req.user.uid) 
        return res.status(403).json({ error: 'You can only update your own issues' });
      
      // User can set only "pending" or "issue resolved"
      if (!['pending', 'issue resolved'].includes(status))
        return res.status(403).json({ error: 'Invalid status for user' });
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await issueRef.update({ status });

    // Prepare response
    const host = req.get('host');
    const protocol = req.protocol;

    let imageUrl = null;
    if (issue.image) {
      if (issue.image.startsWith('http')) imageUrl = issue.image;
      else imageUrl = `${protocol}://${host}/uploads/${path.basename(issue.image)}`;
    }

    let dateMs = null;
    if (issue.date) {
      if (issue.date.toMillis) dateMs = issue.date.toMillis();
      else dateMs = new Date(issue.date).getTime();
    }

    return res.json({
      issue_id: issueId,
      issue_name: issue.issue_name,
      location: issue.location,
      description: issue.description,
      date: dateMs,
      status,
      image: imageUrl,
    });

  } catch (err) {
    console.error('update issue status error', err);
    return res.status(500).json({ error: err.message });
  }
});


// ========================
// 🔹 USER MANAGEMENT ROUTES
// ========================
app.post('/createUser', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await auth.createUser({ email, password, displayName });
    return res.json({ uid: user.uid, email: user.email });
  } catch (err) {
    console.error('createUser error', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/getUser/:uid', async (req, res) => {
  try {
    const user = await auth.getUser(req.params.uid);
    return res.json({ user });
  } catch (err) {
    console.error('getUser error', err);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/deleteUser/:uid', async (req, res) => {
  try {
    await auth.deleteUser(req.params.uid);
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error', err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 AUTH ROUTES
// ========================
// ========================
// 🔹 REGISTER (auto-store role in Firestore)
// ========================
// ========================
// 🔹 REGISTER (default role: user)
// ========================
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email, and password required' });

    // Create user in Firebase Auth
    const user = await auth.createUser({
      displayName: name,
      email,
      password,
    });

    // Default role to 'user'
    const userData = {
      uid: user.uid,
      name,
      email,
      role: 'user',
      createdAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('users').doc(user.uid).set(userData);

    // Create JWT using role from Firestore
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: 'user', provider: 'password' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      role: 'user',
      jwt: token,
    });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: err.message });
  }
});


// ========================
// 🔹 AUTO-CREATE SUPERADMIN (runs once on startup)
// ========================


async function ensureSuperadmin() {
  try {
    let superadminUser;
    try {
      superadminUser = await auth.getUserByEmail(SUPERADMIN_EMAIL);
    } catch {
      superadminUser = await auth.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        displayName: SUPERADMIN_DISPLAYNAME,
      });
      console.log('✅ Superadmin created in Firebase Auth');
    }

    const docRef = db.collection('users').doc(superadminUser.uid);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().role !== 'superadmin') {
      await docRef.set({
        uid: superadminUser.uid,
        name: SUPERADMIN_DISPLAYNAME,
        email: SUPERADMIN_EMAIL,
        role: 'superadmin',
        createdAt: admin.firestore.Timestamp.now(),
      });
      console.log('✅ Superadmin record set in Firestore');
    } else {
      console.log('Superadmin already exists.');
    }
  } catch (err) {
    console.error('❌ Error ensuring superadmin:', err.message);
  }
}
ensureSuperadmin();


// ========================
// 🔹 LOGIN (reads role from Firestore)
// ========================
app.post('/login', async (req, res) => {
  try {
    const { email, password, googleUid } = req.body;

    // 🔸 Google login
    if (googleUid) {
      const user = await auth.getUser(googleUid);
      const userDoc = await db.collection('users').doc(user.uid).get();
      const role = userDoc.exists ? userDoc.data().role : 'user';

      const token = jwt.sign(
        { uid: user.uid, email: user.email, role, provider: 'google' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.json({
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        role,
        jwt: token,
        provider: 'google',
      });
    }

    // 🔸 Email/password login
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDJX1h-OQHLT74bVl_iEHZv4-YsEgCKMhs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    // Fetch user role from Firestore
    const userDoc = await db.collection('users').doc(data.localId).get();
    const role = userDoc.exists ? userDoc.data().role : 'user';

    const token = jwt.sign(
      { uid: data.localId, email: data.email, role, provider: 'password' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      role,
      jwt: token,
      provider: 'password',
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 PROTECTED ROUTE
// ========================
app.get('/dashboard', verifyJWT, async (req, res) => {
  try {
    const userRecord = await auth.getUser(req.user.uid);

    return res.json({
      displayName: userRecord.displayName || 'User',
      email: userRecord.email,
      uid: userRecord.uid,
      role: req.user.role,
      createdAt: userRecord.metadata.creationTime,
      lastLogin: userRecord.metadata.lastSignInTime,
      photoURL: userRecord.photoURL || null,
    });
  } catch (err) {
    console.error('dashboard error', err);
    return res.status(500).json({ error: err.message });
  }
});
app.get('/users', verifyJWT, async (req, res) => {
  try {
    // Only admins can fetch all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const listUsersRecursively = async (nextPageToken) => {
      const users = [];
      const result = await auth.listUsers(1000, nextPageToken);
      result.users.forEach((userRecord) => {
        // Extract user info and role
        users.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || null,
          role: userRecord.customClaims?.role || 'user', // default role 'user'
          provider: userRecord.providerData[0]?.providerId || 'password',
          createdAt: userRecord.metadata.creationTime,
          lastLogin: userRecord.metadata.lastSignInTime,
        });
      });

      if (result.pageToken) {
        users.push(...await listUsersRecursively(result.pageToken));
      }

      return users;
    };

    const users = await listUsersRecursively();
    return res.json({ users });
  } catch (err) {
    console.error('get users error', err);
    return res.status(500).json({ error: err.message });
  }
});
// ========================
// 🔹 GET /all-users (no verification, test only)
// ========================
app.get('/all-users', async (req, res) => {
  try {
    const listUsersRecursively = async (nextPageToken) => {
      const users = [];
      const result = await auth.listUsers(1000, nextPageToken);
      result.users.forEach((userRecord) => {
        users.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || null,
          role: userRecord.customClaims?.role || 'user', // default role
          provider: userRecord.providerData[0]?.providerId || 'password',
        });
      });

      if (result.pageToken) {
        users.push(...await listUsersRecursively(result.pageToken));
      }

      return users;
    };

    const users = await listUsersRecursively();
    return res.json({ users });
  } catch (err) {
    console.error('get all users error', err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 POST /feedback
// ========================
// ========================
// 🔹 POST /feedback
// ========================
app.post('/feedback', verifyJWT, async (req, res) => {
  try {
    const { location, rating, description, sector } = req.body;

    // Check required fields
    if (!location || !rating || !description || !sector) {
      return res.status(400).json({
        error: "location, rating, description, and sector are required",
      });
    }

    // Validate rating
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "rating must be a number between 1 and 5",
      });
    }

    const feedbackData = {
      uid: req.user.uid,
      location,
      rating: Number(rating),
      description,
      sector, // ✅ new field added
      createdAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await db.collection('feedback').add(feedbackData);

    return res.json({
      success: true,
      feedback_id: docRef.id,
      ...feedbackData,
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ========================
// 🔹 GET /my-feedback
// ========================
app.get('/my-feedback', verifyJWT, async (req, res) => {
  try {
    const snapshot = await db
      .collection('feedback')
      .where('uid', '==', req.user.uid)
      .get();

    const feedbacks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ feedbacks });
  } catch (err) {
    console.error('Error getting user feedback:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ========================
// 🔹 GET /feedback (Admin Only)
// ========================
app.get('/feedback', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin')
      return res.status(403).json({ error: 'Forbidden: Admins only' });

    const snapshot = await db
      .collection('feedback')
      .orderBy('createdAt', 'desc')
      .get();

    const feedbacks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ feedbacks });
  } catch (err) {
    console.error('Error getting all feedback:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ========================
// 🔹 START SERVER
// ========================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Admin server running on port ${PORT}`));
