import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/firebase.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

// Master Admin Setup Credentials
export const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
export const DEFAULT_ADMIN_PASSWORD = "Admin@123456";

// ===============================
// Admin Login with Auto-Healing & Strict Verification
// ===============================
export const adminLogin = async (adminData) => {
    const email = (adminData?.email || "").trim();
    const password = adminData?.password || "";

    if (!email || !password) {
        throw new Error("Email and Password are required");
    }

    try {
        console.log(`[AdminAuth] Attempting admin sign-in for: ${email}`);
        let user;
        let tokenResult;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
            tokenResult = await user.getIdTokenResult(true);
        } catch (signInErr) {
            console.warn(`[AdminAuth] Initial sign in code: ${signInErr.code}`);

            // If master credentials were submitted but password differed in Firebase Auth,
            // or if it was not created in Auth yet, auto-register/sync seamlessly!
            if (
                email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
                password === DEFAULT_ADMIN_PASSWORD
            ) {
                console.log("[AdminAuth] Auto-synchronizing Master Admin credentials with Firebase Auth...");
                try {
                    const createdCred = await createUserWithEmailAndPassword(auth, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD);
                    user = createdCred.user;
                    tokenResult = await user.getIdTokenResult(true);
                } catch (createErr) {
                    // If email exists with another password, throw friendly guidance
                    if (createErr.code === "auth/email-already-in-use") {
                        throw new Error(
                            "The email admin@gmail.com already exists in Firebase Auth with a different password. Please check your Firebase Console > Authentication > Users to reset it, or use that password."
                        );
                    }
                    throw createErr;
                }
            } else {
                throw signInErr;
            }
        }

        console.log(`[AdminAuth] Firebase Auth succeeded. UID: ${user.uid}`);

        const hasAdminClaim = tokenResult.claims.admin === true || tokenResult.claims.role === "admin";

        // Verification 1: Check document where doc ID == user.uid
        let hasAdminDoc = false;
        try {
            const adminDocSnap = await getDoc(doc(db, "admins", user.uid));
            if (adminDocSnap.exists()) {
                hasAdminDoc = true;
            }
        } catch (docErr) {
            console.warn("[AdminAuth] Note checking admin doc by UID:", docErr.code || docErr.message);
        }

        // Verification 2: Check by email match in admins collection
        if (!hasAdminDoc && !hasAdminClaim) {
            try {
                const q = query(collection(db, "admins"), where("email", "==", email));
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                    hasAdminDoc = true;
                    // Auto-sync document with user's active UID
                    await setDoc(doc(db, "admins", user.uid), {
                        email: user.email,
                        role: "admin",
                        updatedAt: serverTimestamp(),
                    }, { merge: true });
                }
            } catch (queryErr) {
                console.warn("[AdminAuth] Note querying admin by email:", queryErr.code || queryErr.message);
            }
        }

        // Verification 3: If it's the designated master admin, auto-seed the admins doc
        if (email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() && !hasAdminDoc) {
            try {
                await setDoc(doc(db, "admins", user.uid), {
                    email: user.email,
                    role: "admin",
                    createdAt: serverTimestamp(),
                }, { merge: true });
                hasAdminDoc = true;
            } catch (e) {
                console.warn("[AdminAuth] Note writing admin doc:", e.message);
            }
        }

        console.log(`[AdminAuth] Validation status: hasAdminClaim=${hasAdminClaim}, hasAdminDoc=${hasAdminDoc}`);

        if (!hasAdminClaim && !hasAdminDoc) {
            await auth.signOut();
            throw new Error("Access Denied. You do not have administrator permissions.");
        }

        const adminUser = {
            id: user.uid,
            uid: user.uid,
            email: user.email,
            role: "admin"
        };

        return {
            message: "Admin Login Successful",
            token: tokenResult.token,
            admin: adminUser
        };
    } catch (error) {
        console.error("[AdminAuth] Login failed error code:", error.code, "message:", error.message);

        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
            throw new Error("Invalid admin password. If you forgot the password, reset it in Firebase Console > Authentication > Users.");
        } else if (error.code === "auth/user-not-found") {
            throw new Error("Admin email not found in Firebase Authentication.");
        } else if (error.code === "auth/too-many-requests") {
            throw new Error("Too many failed attempts. Please wait a few moments and try again.");
        } else if (error.message && !error.message.includes("auth/")) {
            throw new Error(error.message);
        }

        throw new Error(error.message || "Invalid admin credentials.");
    }
};
