import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyARl_AiGJ5AYmo0EIt8w_wq9IbjqjF4-Y8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "billing-firebase-1b0e4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "billing-firebase-1b0e4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "billing-firebase-1b0e4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "477563068737",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:477563068737:web:0d96c0e29c3446679241c0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-S7FXG2Y5K2",
};

// Initialize Firebase once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
