import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { resetPassword } from "../../services/forgotPasswordService";
import "./ForgotPassword.css";

const ResetPassword = () => {

    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email;
    const otp = location.state?.otp;

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (!email || !otp) {
            navigate("/forgot-password");
        }
    }, [email, otp, navigate]);

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    if (!email || !otp) {
        return null;
    }

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            timeoutRef.current = setTimeout(() => {
                setError("");
            }, 3000)
            return;
        }

        try {

            setLoading(true);

            const data = await resetPassword(
                email,
                otp,
                newPassword
            );

            setSuccess(data.message);

            timeoutRef.current = setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Failed to reset password."
            );

        } finally {

            setLoading(false);

        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-bg" aria-hidden="true">
                <div className="forgot-orb forgot-orb-1" />
                <div className="forgot-orb forgot-orb-2" />
            </div>
            <div className="forgot-password-card">

                <h1>Reset Password</h1>

                <p>Create a new password for your account.</p>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="success-message">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="input-group">

                        <Lock size={18} />

                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) =>
                                setNewPassword(e.target.value)
                            }
                            required
                        />

                        <button
                            type="button"
                            className="eye-btn"
                            onClick={() =>
                                setShowPassword(!showPassword)
                            }
                        >
                            {showPassword ? (
                                <EyeOff size={18} />
                            ) : (
                                <Eye size={18} />
                            )}
                        </button>

                    </div>

                    <div className="input-group">

                        <Lock size={18} />

                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                            required
                        />

                        <button
                            type="button"
                            className="eye-btn"
                            onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                            }
                        >
                            {showConfirmPassword ? (
                                <EyeOff size={18} />
                            ) : (
                                <Eye size={18} />
                            )}
                        </button>

                    </div>

                    <button
                        type="submit"
                        className="forgot-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2
                                    size={18}
                                    className="spin"
                                />
                                Resetting...
                            </>
                        ) : (
                            "Reset Password"
                        )}
                    </button>

                </form>

            </div>

        </div>
    );
};

export default ResetPassword;