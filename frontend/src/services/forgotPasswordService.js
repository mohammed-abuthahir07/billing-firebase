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
        await sendPasswordResetEmail(auth, email.trim());
        return {
            success: true,
            message: "Password reset email sent. Open the link in that email to choose a new password.",
        };
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new Error("Email not found");
        }
        if (error.code === 'auth/invalid-email') {
            throw new Error("Enter a valid email address.");
        }
        throw new Error(error.message || "Failed to send reset email");
    }
};

export const verifyOTP = async () => {
    throw new Error("Password reset is completed from the link in the Firebase email. This screen does not verify a code.");
};

export const resetPassword = async (email, otp, newPassword) => {
    if (!newPassword) {
        throw new Error("A new password is required.");
    }
    if (!otp || otp.length <= 10) {
        throw new Error("Use the reset link in your email. A 6-digit code cannot change the password.");
    }
    await confirmPasswordReset(auth, otp, newPassword);
    return {
        success: true,
        message: "Password changed successfully",
    };
};
