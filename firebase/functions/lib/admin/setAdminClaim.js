"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAdminClaim = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.setAdminClaim = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { email, secretKey } = request.data;
    // Protective secret guard or allow if caller is already admin
    const isCallerAdmin = request.auth?.token?.admin === true;
    const isBootstrapMatch = secretKey && secretKey === (process.env.ADMIN_BOOTSTRAP_SECRET || "billing-admin-bootstrap-2026");
    if (!isCallerAdmin && !isBootstrapMatch) {
        throw new https_1.HttpsError("permission-denied", "Unauthorized to assign admin role.");
    }
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Email is required.");
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
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to set admin claim.");
    }
});
//# sourceMappingURL=setAdminClaim.js.map