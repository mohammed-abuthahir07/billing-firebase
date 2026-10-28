// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARl_AiGJ5AYmo0EIt8w_wq9IbjqjF4-Y8",
  authDomain: "billing-firebase-1b0e4.firebaseapp.com",
  projectId: "billing-firebase-1b0e4",
  storageBucket: "billing-firebase-1b0e4.firebasestorage.app",
  messagingSenderId: "477563068737",
  appId: "1:477563068737:web:0d96c0e29c3446679241c0",
  measurementId: "G-S7FXG2Y5K2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);