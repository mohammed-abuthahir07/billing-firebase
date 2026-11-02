import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  updateProfile as updateFirebaseProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";

/**
 * Service to manage authenticated business user settings (Profile, Security, App Info).
 */

export const getUserSettingsProfile = async () => {
  const user = auth.currentUser;
  if (!user) {
    const local = JSON.parse(localStorage.getItem("billing_user") || "{}");
    return {
      uid: local.uid || local.id || "",
      email: local.email || "",
      displayName: local.name || "User",
      role: "user",
      createdAt: local.created_at || new Date().toISOString(),
    };
  }

  let firestoreData = {};
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      firestoreData = snap.data();
    }
  } catch (err) {
    console.warn("Could not fetch user document:", err.message);
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || firestoreData.name || user.email?.split("@")[0] || "User",
    role: firestoreData.role || "user",
    createdAt: user.metadata?.creationTime || firestoreData.createdAt || new Date().toISOString(),
    lastSignInTime: user.metadata?.lastSignInTime || new Date().toISOString(),
  };
};

export const updateUserSettingsDisplayName = async (displayName) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated.");

  const trimmed = (displayName || "").trim();
  if (!trimmed) throw new Error("Display name cannot be empty.");

  // 1. Update Firebase Auth profile
  await updateFirebaseProfile(user, { displayName: trimmed });

  // 2. Update Firestore user document
  try {
    await updateDoc(doc(db, "users", user.uid), {
      name: trimmed,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to update firestore user doc:", err.message);
  }

  // 3. Update localStorage billing_user
  try {
    const stored = JSON.parse(localStorage.getItem("billing_user") || "{}");
    localStorage.setItem(
      "billing_user",
      JSON.stringify({
        ...stored,
        name: trimmed,
      })
    );
  } catch (_) {}

  return { success: true, displayName: trimmed };
};

export const changeUserPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("User not authenticated.");

  if (!currentPassword || !newPassword) {
    throw new Error("Both current and new passwords are required.");
  }

  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters long.");
  }

  // Re-authenticate user before changing sensitive credential
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  } catch (err) {
    if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      throw new Error("Incorrect current password. Please try again.");
    }
    if (err.code === "auth/too-many-requests") {
      throw new Error("Too many failed attempts. Please try again later.");
    }
    throw new Error(err.message || "Authentication verification failed.");
  }

  // Update password in Firebase Auth
  try {
    await updatePassword(user, newPassword);
  } catch (err) {
    if (err.code === "auth/weak-password") {
      throw new Error("The password is too weak. Please use a stronger password.");
    }
    if (err.code === "auth/requires-recent-login") {
      throw new Error("Session expired. Please log out and log back in to change your password.");
    }
    throw new Error(err.message || "Failed to update password.");
  }

  return { success: true, message: "Password updated successfully." };
};

export const getUserAppInformation = () => {
  return {
    appName: "Billing SaaS",
    version: "2.1.0",
    environment: "Production (Vercel)",
    platformTier: "Firebase Spark (Free Plan)",
    projectId: "billing-firebase-1b0e4",
    database: "Google Cloud Firestore",
    authProvider: "Firebase Authentication",
    pdfEngine: "Vector jsPDF Engine",
    reactVersion: "19.2.7",
    buildTool: "Vite 8.1.5",
    status: "All Systems Operational",
    lastDeployed: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
};
