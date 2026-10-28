import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Loader2 } from "lucide-react";
import { sendOTP } from "../../services/forgotPasswordService";
import "./ForgotPassword.css";

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const timeoutRef = useRef(null);

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const data = await sendOTP(email);

            setSuccess(data.message);

            timeoutRef.current = setTimeout(() => {
                navigate("/verify-otp", {
                    state: {
                        email,
                    },
                });
            }, 1500);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to send OTP."
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

                <h1>Forgot Password</h1>

                <p>
                    Enter your registered email address.
                    We'll send you a One-Time Password (OTP).
                </p>

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

                        <Mail size={18} />

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            required
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="forgot-btn"
                    >
                        {loading ? (
                            <>
                                <Loader2
                                    size={18}
                                    className="spin"
                                />
                                Sending OTP...
                            </>
                        ) : (
                            "Send OTP"
                        )}
                    </button>

                </form>

                <div className="back-login">

                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        Back to Login
                    </button>

                </div>

            </div>

        </div>
    );
};

export default ForgotPassword;