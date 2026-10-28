/**
 * Platform Owner CLI Script: Secure Admin Provisioning
 * Usage: node scripts/createAdminAccount.js <adminEmail> <adminPassword>
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARl_AiGJ5AYmo0EIt8w_wq9IbjqjF4-Y8",
  authDomain: "billing-firebase-1b0e4.firebaseapp.com",
  projectId: "billing-firebase-1b0e4",
  storageBucket: "billing-firebase-1b0e4.firebasestorage.app",
  messagingSenderId: "477563068737",
  appId: "1:477563068737:web:0d96c0e29c3446679241c0",
  measurementId: "G-S7FXG2Y5K2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = process.argv[2] || "admin@gmail.com";
const adminPassword = process.argv[3] || "Admin@123456";

async function provisionAdmin() {
  console.log(`🔐 Provisioning Admin Account: ${adminEmail}`);

  let user;
  try {
    const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    user = cred.user;
    console.log(`✅ Created Admin user in Firebase Auth (UID: ${user.uid})`);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log(`ℹ️ Account ${adminEmail} already exists. Authenticating...`);
      const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      user = cred.user;
      console.log(`✅ Authenticated Admin user (UID: ${user.uid})`);
    } else {
      console.error("❌ Failed to create/sign in user:", err.message);
      process.exit(1);
    }
  }

  // Record in Firestore admins directory
  try {
    await setDoc(doc(db, "admins", user.uid), {
      email: user.email,
      role: "admin",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`✅ Registered in Firestore 'admins/${user.uid}' collection.`);
    console.log(`\n=================================================`);
    console.log(`🎉 Admin Account Ready!`);
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Login at: http://localhost:5173/admin/login`);
    console.log(`=================================================\n`);
  } catch (dbErr) {
    console.error("❌ Failed to record in admins collection:", dbErr.message);
  }
}

provisionAdmin();
