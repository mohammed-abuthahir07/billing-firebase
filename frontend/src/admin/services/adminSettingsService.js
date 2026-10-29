import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
    updateProfile as updateFirebaseProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../../firebase/firebase";

/**
 * Admin profile and system settings service.
 */
export const getAdminProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
        // Fallback to local storage if auth is restoring
        const local = JSON.parse(localStorage.getItem("admin_user") || "{}");
        return {
            email: local.email || "admin@gmail.com",
            displayName: local.name || "Administrator",
            role: "admin",
            createdAt: local.createdAt || new Date().toISOString(),
        };
    }

    let adminDocData = {};
    try {
        const snap = await getDoc(doc(db, "admins", user.uid));
        if (snap.exists()) {
            adminDocData = snap.data();
        }
    } catch (_) {}

    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || adminDocData.name || "Administrator",
        role: "admin",
        createdAt: user.metadata?.creationTime || adminDocData.createdAt || new Date().toISOString(),
        lastSignInTime: user.metadata?.lastSignInTime || new Date().toISOString(),
    };
};

export const updateAdminProfile = async ({ displayName }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Admin not authenticated.");

    const trimmed = (displayName || "").trim();
    if (!trimmed) throw new Error("Display name cannot be empty.");

    // 1. Update Firebase Auth Profile
    await updateFirebaseProfile(user, { displayName: trimmed });

    // 2. Update Firestore admin record
    await setDoc(
        doc(db, "admins", user.uid),
        {
            name: trimmed,
            email: user.email,
            role: "admin",
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    // 3. Update localStorage
    const local = JSON.parse(localStorage.getItem("admin_user") || "{}");
    const updated = {
        ...local,
        name: trimmed,
        displayName: trimmed,
    };
    localStorage.setItem("admin_user", JSON.stringify(updated));

    return { success: true, displayName: trimmed };
};

export const changeAdminPassword = async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Admin not authenticated.");

    if (!currentPassword || !newPassword) {
        throw new Error("Both current and new passwords are required.");
    }

    if (newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters long.");
    }

    // Secure re-authentication before sensitive operation
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password in Firebase Auth
    await updatePassword(user, newPassword);

    return { success: true, message: "Password updated successfully." };
};

export const sendAdminPasswordReset = async (email) => {
    const targetEmail = (email || auth.currentUser?.email || "").trim();
    if (!targetEmail) throw new Error("Please specify an email address.");

    await sendPasswordResetEmail(auth, targetEmail);
    return { success: true, message: `Password reset email sent to ${targetEmail}.` };
};

export const getAppInformation = () => {
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
        lastDeployed: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }),
    };
};
