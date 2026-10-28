import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import {
    verifyOTP,
    sendOTP
} from "../../services/forgotPasswordService";
import "./ForgotPassword.css";

const VerifyOTP = () => {

    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email;

    const [otp, setOtp] = useState("");

    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const timeoutRef = useRef(null);

    // 5 Minutes
    const [timeLeft, setTimeLeft] = useState(300);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (!email) {
            navigate("/forgot-password");
        }
    }, [email, navigate]);

    useEffect(() => {

        if (timeLeft <= 0) {
            setCanResend(true);
            return;
        }

        const timer = setTimeout(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);

    }, [timeLeft]);

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const seconds = String(timeLeft % 60).padStart(2, "0");

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (otp.length !== 6) {
            setError("OTP must be exactly 6 digits.");
            return;
        }

        try {

            setLoading(true);

            const data = await verifyOTP(email, otp);

            setSuccess(data.message);

            timeoutRef.current = setTimeout(() => {

                navigate("/reset-password", {
                    state: {
                        email,
                        otp,
                    },
                });

            }, 1000);

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Invalid or expired OTP."
            );

        } finally {

            setLoading(false);

        }

    };

    const handleResendOTP = async () => {

        try {

            setResendLoading(true);

            setError("");
            setSuccess("");

            await sendOTP(email);

            setSuccess("A new OTP has been sent to your email.");

            setOtp("");

            setTimeLeft(300);

            setCanResend(false);

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Failed to resend OTP."
            );

        } finally {

            setResendLoading(false);

        }

    };

    if (!email) return null;

    return (

        <div className="forgot-password-container">
            <div className="forgot-bg" aria-hidden="true">
                <div className="forgot-orb forgot-orb-1" />
                <div className="forgot-orb forgot-orb-2" />
            </div>
            <div className="forgot-password-card">

                <h1>Verify OTP</h1>

                <p>
                    Enter the 6-digit OTP sent to your registered email.
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

                        <ShieldCheck size={18} />

                        <input
                            type="text"
                            placeholder="Enter OTP"
                            value={otp}
                            maxLength={6}
                            inputMode="numeric"
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setOtp(value);
                            }}
                            required
                        />

                    </div>

                    <div className="otp-timer">
                        OTP expires in
                        <span>{minutes}:{seconds}</span>
                    </div>

                    {canResend && (

                        <button
                            type="button"
                            className="resend-btn"
                            onClick={handleResendOTP}
                            disabled={resendLoading}
                        >
                            {resendLoading
                                ? "Sending..."
                                : "Resend OTP"}
                        </button>

                    )}

                    <button
                        type="submit"
                        className="forgot-btn"
                        disabled={loading || timeLeft === 0}
                    >
                        {loading ? (
                            <>
                                <Loader2
                                    size={18}
                                    className="spin"
                                />
                                Verifying...
                            </>
                        ) : (
                            "Verify OTP"
                        )}
                    </button>

                </form>
            </div>
        </div>

    );

};

export default VerifyOTP;