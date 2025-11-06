// server.js (CommonJS)
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// IMPORTANT: serviceAccountKey.json must remain on the server only and never be pushed to git
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const app = express();
app.use(cors({
  origin: "http://localhost:5173", // or 3000 if CRA
  credentials: true,
})); // allow your frontend origin or configure tightly in production
app.use(express.json());

// Create a user (admin creates user)
app.post('/createUser', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await auth.createUser({ email, password, displayName });
    return res.json({ uid: user.uid, email: user.email });
  } catch (err) {
    console.error('createUser error', err);
    return res.status(500).json({ error: err.message });
  }
});

// Optional: get user by uid or email
app.get('/getUser/:uid', async (req, res) => {
  try {
    const user = await auth.getUser(req.params.uid);
    return res.json({ user });
  } catch (err) {
    console.error('getUser error', err);
    return res.status(500).json({ error: err.message });
  }
});
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email, and password required' });

    const user = await auth.createUser({
      displayName: name,
      email,
      password,
    });

    return res.json({
      uid: user.uid,
      email: user.email,
      name: user.displayName,
    });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Login (email/password OR Google UID) ---
app.post('/login', async (req, res) => {
  try {
    const { email, password, googleUid } = req.body;

    // Google login
    if (googleUid) {
      const user = await auth.getUser(googleUid);
      return res.json({
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        provider: 'google',
      });
    }

    // Email/password login via Firebase REST API
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });

    const FIREBASE_API_KEY = 'AIzaSyDJX1h-OQHLT74bVl_iEHZv4-YsEgCKMhs'; // Put your key here
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

    return res.json({
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      provider: 'password',
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: err.message });
  }
});


// Optional: delete user
app.delete('/deleteUser/:uid', async (req, res) => {
  try {
    await auth.deleteUser(req.params.uid);
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error', err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Admin server running on port ${PORT}`));
