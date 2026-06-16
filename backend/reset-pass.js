require('dotenv').config();
const admin = require('firebase-admin');

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

const email = 'mandalapudileep5@gmail.com';
const newPassword = 'Dileep@14999';

admin.auth().getUserByEmail(email)
  .then(user => {
    return admin.auth().updateUser(user.uid, { password: newPassword });
  })
  .then(() => {
    console.log(`Successfully updated password for ${email} to ${newPassword}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error updating password:', err);
    process.exit(1);
  });
