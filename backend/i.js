// server.js (CommonJS)
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const fs = require('fs');
const { registerExtendedRoutes, memoryUpload } = require('./routes/extensions');
const driveService = require('./services/driveService');
// Initialize app
const app = express();
app.use(express.json());

// Recursive input sanitization to block stored/reflected XSS and NoSQL injection
function sanitizeInput(val) {
  if (typeof val === 'string') {
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeInput);
  }
  if (typeof val === 'object' && val !== null) {
    const clean = {};
    for (const key in val) {
      if (key === '__proto__' || key === 'constructor') continue;
      clean[key] = sanitizeInput(val[key]);
    }
    return clean;
  }
  return val;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
}

app.use(sanitizeMiddleware);

// CORS configuration with credentials support and dynamic origins whitelist
const allowedOrigins = [
  'http://localhost:5173',
  'http://10.117.219.33:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.loca.lt') || origin.endsWith('.ngrok-free.app')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['Authorization', 'Set-Cookie']
}));

// Firebase setup
let serviceAccount;
if (process.env.FIREBASE_PRIVATE_KEY) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
} else {
  serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();
const fetch = require('node-fetch');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';

// ========================
// 🔹 JWT AUTH MIDDLEWARE (Cookies & Headers)
// ========================
function verifyJWT(req, res, next) {
  let token = null;

  // 1. Try Authorization header first (since client explicitly sends it)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Fall back to cookie if Authorization header is missing
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;)\s*token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Sliding window: renew session token for another 2 hours on every request
    const renewedToken = jwt.sign(
      { uid: decoded.uid, email: decoded.email, role: decoded.role, provider: decoded.provider },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Set renewed token in HTTP-only Cookie
    res.cookie('token', renewedToken, {
      httpOnly: true,
      secure: false, // Local network testing uses HTTP
      sameSite: 'Lax',
      path: '/',
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    res.setHeader('Access-Control-Expose-Headers', 'Authorization');
    res.setHeader('Authorization', `Bearer ${renewedToken}`);

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}



// ========================
// 🔹 ISSUE MANAGEMENT ROUTES
// ========================

// ---------------------------
// SUPERADMIN: default credentials (DEV ONLY)
// ---------------------------
// superadmin credentials (as requested)
// superadmin credentials (loaded from .env)
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 's@gmail.com';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin';
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
    if (err.code === 5) {
      console.error('\n❌ ERROR: Firestore Database has not been initialized/created in Firebase Project "civic-review-portal".');
      console.error('👉 Action Required: Go to the Firebase Console -> Firestore Database, click "Create database", choose a location, and set up the database.\n');
    } else {
      console.error('Error ensuring superadmin exists:', err);
    }
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

    // Create user folder in Google Drive (runs asynchronously)
    driveService.createUserFolder(newUser.uid).catch(err => console.error("Error pre-creating folder:", err));

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
function resolveImageUrl(req, imageField) {
  if (!imageField) return null;
  if (imageField.startsWith('http')) return imageField;
  const host = req.get('host');
  const protocol = req.protocol;
  if (imageField.includes('/uploads/')) return imageField;
  return `${protocol}://${host}/files/${imageField}`;
}

// POST /issues (Drive or local via driveService)
app.post("/issues", verifyJWT, memoryUpload.single("image"), async (req, res) => {
  try {
    const { issue_name, location, description, communityId } = req.body;

    if (!issue_name || !location || !description)
      return res.status(400).json({ error: "Missing required fields" });

    // Generate Firestore document ID first
    const docRef = db.collection("issues").doc();
    const issueId = docRef.id;

    let imageId = null;
    if (req.file) {
      // Find extension (e.g. .jpg)
      const ext = path.extname(req.file.originalname) || ".jpg";
      const customFilename = `${issueId}${ext}`;

      const uploaded = await driveService.uploadFile(
        req.file.buffer,
        customFilename,
        req.file.mimetype,
        req.user.uid
      );
      imageId = uploaded.fileId;
    }

    const newIssue = {
      uid: req.user.uid,
      issue_name,
      location,
      description,
      date: admin.firestore.Timestamp.now(),
      status: "pending",
      image: imageId,
      communityId: communityId || null,
    };

    // Save using the generated document reference
    await docRef.set(newIssue);
    return res.json({
      issue_id: issueId,
      ...newIssue,
      image: resolveImageUrl(req, imageId),
    });
  } catch (err) {
    console.error("Error creating issue:", err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /issues/:issueId (Edit existing issue)
app.put("/issues/:issueId", verifyJWT, memoryUpload.single("image"), async (req, res) => {
  try {
    const { issueId } = req.params;
    const { issue_name, location, description, communityId } = req.body;

    if (!issue_name || !location || !description)
      return res.status(400).json({ error: "Missing required fields" });

    const docRef = db.collection("issues").doc(issueId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Issue not found" });

    const issueData = doc.data();
    if (issueData.uid !== req.user.uid) {
      return res.status(403).json({ error: "You can only edit your own issues" });
    }

    let imageId = issueData.image;

    // If a new image is provided
    if (req.file) {
      // Try to delete old file from Drive if it exists
      if (issueData.image) {
        await driveService.deleteFile(issueData.image);
      }

      // Upload the new image with the Firestore unique ID
      const ext = path.extname(req.file.originalname) || ".jpg";
      const customFilename = `${issueId}${ext}`;
      const uploaded = await driveService.uploadFile(
        req.file.buffer,
        customFilename,
        req.file.mimetype,
        req.user.uid
      );
      imageId = uploaded.fileId;
    }

    const updatedIssue = {
      issue_name,
      location,
      description,
      communityId: communityId || null,
      image: imageId,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await docRef.update(updatedIssue);

    return res.json({
      issue_id: issueId,
      ...issueData,
      ...updatedIssue,
      image: resolveImageUrl(req, imageId),
    });
  } catch (err) {
    console.error("Error updating issue:", err);
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

      return {
        issue_id: doc.id,
        issue_name: data.issue_name,
        location: data.location,
        description: data.description,
        date: dateMs,
        status: data.status,
        image: resolveImageUrl(req, data.image),
        communityId: data.communityId || null,
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

      return {
        issue_id: doc.id,
        issue_name: data.issue_name,
        location: data.location,
        description: data.description,
        date: dateMs,
        status: data.status,
        image: resolveImageUrl(req, data.image),
        communityId: data.communityId || null,
      };
    });

    // Sort in-memory by date descending to bypass Firestore composite index requirement
    issues.sort((a, b) => (b.date || 0) - (a.date || 0));

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
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      // Admin/Superadmin can set status to pending, on process, or solved
      if (!['pending', 'on process', 'solved'].includes(status))
        return res.status(400).json({ error: 'Invalid status for admin' });
    } else if (req.user.role === 'user') {
      // User can only update their own issue
      if (issue.uid !== req.user.uid) 
        return res.status(403).json({ error: 'You can only update your own issues' });
      
      // User can set only "pending" or "resolved pending approval" (requires admin to approve)
      if (!['pending', 'resolved pending approval'].includes(status))
        return res.status(403).json({ error: 'Invalid status for user: users can only set to pending or resolved pending approval' });
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await issueRef.update({ status });

    // Prepare response
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
      image: resolveImageUrl(req, issue.image),
    });

  } catch (err) {
    console.error('update issue status error', err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================
// 🔹 DELETE /issues/:issueId
// ========================
app.delete('/issues/:issueId', verifyJWT, async (req, res) => {
  try {
    const { issueId } = req.params;
    const docRef = db.collection('issues').doc(issueId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });

    const issueData = doc.data();
    // Allow the owner of the issue OR an admin/superadmin to delete it
    if (issueData.uid !== req.user.uid && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'You can only delete your own issues' });
    }

    // Try to delete file from Drive/local if it exists
    if (issueData.image) {
      await driveService.deleteFile(issueData.image);
    }

    await docRef.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting issue:', err);
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
    // Create user folder in Google Drive (runs asynchronously)
    driveService.createUserFolder(user.uid).catch(err => console.error("Error pre-creating folder:", err));
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

app.delete('/deleteUser/:uid', verifyJWT, async (req, res) => {
  const { uid } = req.params;
  
  // Security check: Only superadmins or the user themselves can trigger account deletion
  if (req.user.role !== 'superadmin' && req.user.uid !== uid) {
    return res.status(403).json({ error: 'Forbidden: You can only delete your own account or must be a superadmin' });
  }

  try {
    console.log(`Starting cascading deletion lifecycle for user: ${uid}`);

    // 1. Delete user from Firebase Auth
    try {
      await auth.deleteUser(uid);
      console.log(`- Deleted user from Firebase Auth`);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        console.log(`- User already deleted or not found in Firebase Auth`);
      } else {
        throw authErr;
      }
    }

    // 2. Delete reported issues & images
    const issuesSnapshot = await db.collection('issues').where('uid', '==', uid).get();
    for (const issueDoc of issuesSnapshot.docs) {
      const issueData = issueDoc.data();
      if (issueData.image) {
        await driveService.deleteFile(issueData.image).catch(err => 
          console.warn(`Failed to delete issue image ${issueData.image}:`, err.message)
        );
      }
      await issueDoc.ref.delete();
      console.log(`- Deleted issue document: ${issueDoc.id}`);
    }

    // 3. Delete feedback submissions
    const feedbackSnapshot = await db.collection('feedback').where('uid', '==', uid).get();
    for (const fbDoc of feedbackSnapshot.docs) {
      await fbDoc.ref.delete();
      console.log(`- Deleted feedback document: ${fbDoc.id}`);
    }

    // 4. Delete community messages & images
    const messagesSnapshot = await db.collection('community_messages').where('uid', '==', uid).get();
    for (const msgDoc of messagesSnapshot.docs) {
      const msgData = msgDoc.data();
      if (msgData.image) {
        await driveService.deleteFile(msgData.image).catch(err => 
          console.warn(`Failed to delete chat image ${msgData.image}:`, err.message)
        );
      }
      await msgDoc.ref.delete();
      console.log(`- Deleted chat message document: ${msgDoc.id}`);
    }

    // 5. Remove membership from communities & delete communities owned by the user
    const memberCommunities = await db.collection('communities').where('memberIds', 'array-contains', uid).get();
    for (const commDoc of memberCommunities.docs) {
      const commData = commDoc.data();
      const communityId = commDoc.id;

      if (commData.adminUid === uid) {
        // User is the admin/creator -> delete the entire community!
        console.log(`- User is admin of community ${communityId}. Deleting community...`);

        // a. Delete all channels in the community
        const channelsSnapshot = await db.collection('community_channels').where('communityId', '==', communityId).get();
        for (const chanDoc of channelsSnapshot.docs) {
          const channelId = chanDoc.id;

          // b. Delete all messages inside this channel (with their files)
          const chanMsgsSnapshot = await db.collection('community_messages').where('channelId', '==', channelId).get();
          for (const cmDoc of chanMsgsSnapshot.docs) {
            const cmData = cmDoc.data();
            if (cmData.image) {
              await driveService.deleteFile(cmData.image).catch(err => 
                console.warn(`Failed to delete message image ${cmData.image}:`, err.message)
              );
            }
            await cmDoc.ref.delete();
          }

          await chanDoc.ref.delete();
          console.log(`  - Deleted community channel: ${channelId}`);
        }

        // c. Delete the community document
        await commDoc.ref.delete();
        console.log(`  - Deleted community document: ${communityId}`);
      } else {
        // User is just a member -> remove from memberIds list
        const updatedMembers = (commData.memberIds || []).filter(mId => mId !== uid);
        await commDoc.ref.update({ memberIds: updatedMembers });
        console.log(`- Removed user from membership of community: ${communityId}`);
      }
    }

    // 6. Delete user files/folders on local disk & Google Drive
    await driveService.deleteUserFolder(uid);
    console.log(`- Cleaned up user folders in Drive/local disk`);

    // 7. Delete user profile document in Firestore
    await db.collection('users').doc(uid).delete();
    console.log(`- Deleted user profile document in Firestore`);

    console.log(`User deletion cascading lifecycle completed successfully for ${uid}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteUser cascading error:', err);
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
      phone: '',
      bio: '',
      address: {},
      interests: [],
      communityIds: [],
      profileVisibility: 'community',
      avatarDriveId: null,
      createdAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('users').doc(user.uid).set(userData);

    // Create user folder in Google Drive (runs asynchronously)
    driveService.createUserFolder(user.uid).catch(err => console.error("Error pre-creating folder:", err));

    // Create JWT using role from Firestore
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: 'user', provider: 'password' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/',
      maxAge: 2 * 60 * 60 * 1000
    });

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
    if (err.code === 5) {
      console.error('\n❌ ERROR: Firestore Database has not been initialized/created in Firebase Project "civic-review-portal".');
      console.error('👉 Action Required: Go to the Firebase Console -> Firestore Database, click "Create database", choose a location, and set up the database.\n');
    } else {
      console.error('❌ Error ensuring superadmin:', err.message);
    }
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
      const userRef = db.collection('users').doc(user.uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        await userRef.set({
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email,
          role: 'user',
          phone: '',
          bio: '',
          address: {},
          interests: [],
          communityIds: [],
          profileVisibility: 'community',
          avatarDriveId: null,
          createdAt: admin.firestore.Timestamp.now(),
        });
        // Create user folder in Google Drive (runs asynchronously)
        driveService.createUserFolder(user.uid).catch(err => console.error("Error pre-creating folder:", err));
      }
      const role = userDoc.exists ? userDoc.data().role : 'user';

      const token = jwt.sign(
        { uid: user.uid, email: user.email, role, provider: 'google' },
        JWT_SECRET,
        { expiresIn: '2h' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        path: '/',
        maxAge: 2 * 60 * 60 * 1000
      });

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
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    // Fetch user role from Firestore, auto-create doc if missing
    const userRef = db.collection('users').doc(data.localId);
    let userDoc = await userRef.get();
    let role = 'user';
    if (!userDoc.exists) {
      try {
        const authUser = await auth.getUser(data.localId);
        const userData = {
          uid: data.localId,
          name: authUser.displayName || data.email.split('@')[0],
          email: data.email,
          role: 'user',
          phone: '',
          bio: '',
          address: {},
          interests: [],
          communityIds: [],
          profileVisibility: 'community',
          avatarDriveId: null,
          createdAt: admin.firestore.Timestamp.now(),
        };
        await userRef.set(userData);
        userDoc = await userRef.get();
      } catch (authErr) {
        console.error('Error auto-creating user in Firestore on login:', authErr);
      }
    }
    role = userDoc.exists ? (userDoc.data().role || 'user') : 'user';

    const token = jwt.sign(
      { uid: data.localId, email: data.email, role, provider: 'password' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/',
      maxAge: 2 * 60 * 60 * 1000
    });

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
// 🔹 LOGOUT (Clears Cookie)
// ========================
app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    path: '/'
  });
  return res.json({ success: true });
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
// 🔹 GET /stats/dashboard (authenticated stats)
// ========================
app.get('/stats/dashboard', verifyJWT, async (req, res) => {
  try {
    const feedbackSnap = await db.collection('feedback').get();
    const feedbacks = feedbackSnap.docs.map(doc => doc.data());

    // Group by location
    const localityRatings = {};
    feedbacks.forEach(fb => {
      const loc = (fb.location || "").trim();
      if (!loc) return;
      const key = loc.toLowerCase();
      if (!localityRatings[key]) {
        localityRatings[key] = { name: loc, total: 0, sum: 0 };
      }
      localityRatings[key].total += 1;
      localityRatings[key].sum += fb.rating || 0;
    });

    const localities = Object.values(localityRatings).map(item => ({
      name: item.name,
      avgRating: (item.sum / item.total).toFixed(1),
      count: item.total
    }));

    // Group by sector
    const sectorRatings = {};
    feedbacks.forEach(fb => {
      const sec = (fb.sector || "Other").trim();
      if (!sectorRatings[sec]) {
        sectorRatings[sec] = { name: sec, total: 0, sum: 0 };
      }
      sectorRatings[sec].total += 1;
      sectorRatings[sec].sum += fb.rating || 0;
    });

    const sectors = Object.values(sectorRatings).map(item => ({
      name: item.name,
      avgRating: (item.sum / item.total).toFixed(1),
      count: item.total
    }));

    return res.json({ localities, sectors });
  } catch (err) {
    console.error('stats dashboard error', err);
    return res.status(500).json({ error: err.message });
  }
});

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

registerExtendedRoutes(app, { db, admin, verifyJWT });

// ========================
// 🔹 START SERVER
// ========================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Admin server running on port ${PORT}`));
