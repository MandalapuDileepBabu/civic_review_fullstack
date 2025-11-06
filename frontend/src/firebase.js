// Import the functions you need from Firebase
// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
  

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDJX1h-OQHLT74bVl_iEHZv4-YsEgCKMhs",
  authDomain: "civic-review-portal.firebaseapp.com",
  projectId: "civic-review-portal",
  storageBucket: "civic-review-portal.firebasestorage.app",
  messagingSenderId: "72891103391",
  appId: "1:72891103391:web:796e8f16d9275740f84aaa",
  measurementId: "G-86EC3F7D2T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
