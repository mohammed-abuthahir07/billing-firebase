import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const setAdminClaim = onCall(
  { cors: true },
  async (request) => {
    const { email, secretKey } = request.data as { email: string; secretKey: string };

    // Protective secret guard or allow if caller is already admin
    const isCallerAdmin = request.auth?.token?.admin === true;
    const isBootstrapMatch = secretKey && secretKey === (process.env.ADMIN_BOOTSTRAP_SECRET || "billing-admin-bootstrap-2026");

    if (!isCallerAdmin && !isBootstrapMatch) {
      throw new HttpsError("permission-denied", "Unauthorized to assign admin role.");
    }

    if (!email) {
      throw new HttpsError("invalid-argument", "Email is required.");
    }

    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { admin: true, role: "admin" });

      // Record in admin collection for quick lookups
      await admin.firestore().doc(`admins/${user.uid}`).set({
        email: user.email,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: "admin",
      });

      return {
        success: true,
        message: `Admin custom claim successfully granted to ${email}.`,
      };
    } catch (err: any) {
      throw new HttpsError("internal", err.message || "Failed to set admin claim.");
    }
  }
);
