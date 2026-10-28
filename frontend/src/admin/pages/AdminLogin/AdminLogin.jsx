import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Shield, Loader2, X } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminLogin } from "../../../admin/services/adminAuthService";
import "./AdminLogin.css";

const AdminLogin = () => {

    const navigate = useNavigate();
    const { login } = useAdminAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!email.trim()) {
            setError("Admin email is required.");
            return;
        }
        if (!password.trim()) {
            setError("Password is required.");
            return;
        }
        try {
            setLoading(true);
            const data = await adminLogin({
                email,
                password,
            });
            // Save through Admin Context
            login(data.token, data.admin);
            navigate("/admin/dashboard");
        } catch (err) {
            setError(
                err.message || err.response?.data?.message ||
                "Invalid admin credentials."
            );
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="admin-login-container">
            <div className="admin-login-bg" aria-hidden="true">
                <div className="admin-orb admin-orb-1" />
                <div className="admin-orb admin-orb-2" />
                <div className="admin-orb admin-orb-3" />
            </div>
            <div className="admin-login-card">
                <button 
                    type="button" 
                    className="admin-close-btn" 
                    onClick={() => navigate('/login')} 
                    aria-label="Go back"
                >
                    <X size={20} />
                </button>
                <div className="admin-login-header">
                    <span className="auth-brand-mark">BS</span>
                    <div className="admin-icon">
                        <Shield size={45} />
                    </div>
                    <h2>Admin Login</h2>
                    <p>Billing SaaS Administration</p>
                </div>
                {error && (
                    <div className="admin-error">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <Mail size={18} />
                        <input
                            type="email"
                            placeholder="Admin Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                    </div>

                    <div className="input-group">

                        <Lock size={18} />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                    </div>

                    <button
                        type="submit"
                        className="admin-login-btn"
                        disabled={loading}
                    >

                        {loading ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                Logging In...
                            </>
                        ) : (
                            "Login"
                        )}

                    </button>

                </form>

            </div>
        </div>
    );
};

export default AdminLogin;