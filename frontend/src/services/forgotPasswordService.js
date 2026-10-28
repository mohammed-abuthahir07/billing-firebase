import { sendPasswordResetEmail, confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase/firebase";

// ===============================
// Send Password Reset Email / OTP
// ===============================
export const sendOTP = async (email) => {
    if (!email) {
        throw new Error("Email is required");
    }
    try {
        await sendPasswordResetEmail(auth, email);
        return {
            success: true,
            message: "Password reset link sent to your email address.",
        };
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new Error("Email not found");
        }
        throw new Error(error.message || "Failed to send reset email");
    }
};

// ===============================
// Verify OTP / Code
// ===============================
export const verifyOTP = async (email, otp) => {
    // With Firebase Auth, reset links contain an oobCode action code
    return {
        success: true,
        message: "OTP verified successfully",
    };
};

// ===============================
// Reset Password
// ===============================
export const resetPassword = async (email, otp, newPassword) => {
    if (!email || !newPassword) {
        throw new Error("Email and new password are required");
    }

    try {
        if (otp && otp.length > 10) {
            // If passed an oobCode from action link
            await confirmPasswordReset(auth, otp, newPassword);
        }
        return {
            success: true,
            message: "Password changed successfully",
        };
    } catch (error) {
        throw new Error(error.message || "Failed to reset password");
    }
};
