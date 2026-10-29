import { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    User,
    Moon,
    Sun,
    Lock,
    Info,
    Save,
    KeyRound,
    Mail,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from "lucide-react";
import {
    getAdminProfile,
    updateAdminProfile,
    changeAdminPassword,
    sendAdminPasswordReset,
    getAppInformation,
} from "../../services/adminSettingsService";
import { useAdminUI } from "../../context/AdminUIContext";
import "./AdminSettings.css";

const AdminSettings = () => {
    const { adminTheme, setAdminTheme } = useAdminUI();

    const [activeTab, setActiveTab] = useState("profile");
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);

    // Profile form
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");

    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Feedback
    const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4500);
    };

    useEffect(() => {
        const load = async () => {
            try {
                setLoadingProfile(true);
                const prof = await getAdminProfile();
                setEmail(prof.email || "admin@gmail.com");
                setDisplayName(prof.displayName || "Administrator");
            } catch (err) {
                console.error("Failed to load admin profile:", err);
            } finally {
                setLoadingProfile(false);
            }
        };
        load();
    }, []);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            setSavingProfile(true);
            await updateAdminProfile({ displayName });
            showToast("success", "Admin profile updated successfully.");
        } catch (err) {
            showToast("error", err.message || "Failed to update profile.");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast("error", "New password and confirmation do not match.");
            return;
        }
        if (newPassword.length < 6) {
            showToast("error", "New password must be at least 6 characters.");
            return;
        }

        try {
            setUpdatingPassword(true);
            await changeAdminPassword(currentPassword, newPassword);
            showToast("success", "Admin password changed successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            showToast("error", err.message || "Failed to change password.");
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleSendResetEmail = async () => {
        try {
            setSendingReset(true);
            await sendAdminPasswordReset(email);
            showToast("success", `Password reset instructions sent to ${email}.`);
        } catch (err) {
            showToast("error", err.message || "Failed to send reset email.");
        } finally {
            setSendingReset(false);
        }
    };

    const appInfo = getAppInformation();

    return (
        <div className="admin-settings-page">
            <header className="settings-header">
                <div>
                    <span className="settings-kicker">
                        <SettingsIcon size={14} /> System
                    </span>
                    <h1 className="settings-title">Admin Settings</h1>
                    <p className="settings-subtitle">
                        Manage your administrator account, interface theme, and view platform diagnostic info.
                    </p>
                </div>
            </header>

            {/* Notification Toast */}
            {toast && (
                <div className={`settings-toast ${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
                    onClick={() => setActiveTab("profile")}
                >
                    <User size={16} /> Profile
                </button>
                
                <button
                    className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
                    onClick={() => setActiveTab("security")}
                >
                    <Lock size={16} /> Security
                </button>
                <button
                    className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
                    onClick={() => setActiveTab("info")}
                >
                    <Info size={16} /> Application Info
                </button>
            </div>

            {/* TAB: PROFILE */}
            {activeTab === "profile" && (
                <div className="settings-card">
                    <div className="card-section-head">
                        <h2>Administrator Profile</h2>
                        <p>View and update your administrative credentials.</p>
                    </div>

                    {loadingProfile ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "#64748b" }}>
                            <Loader2 size={18} className="spin-icon" />
                            <span>Loading admin profile...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveProfile} className="settings-form">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" value={email} disabled />
                                <span className="form-hint">Admin email address cannot be changed directly.</span>
                            </div>

                            <div className="form-group">
                                <label>Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Administrator"
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-btn" disabled={savingProfile}>
                                {savingProfile ? <Loader2 size={16} className="spin-icon" /> : <Save size={16} />}
                                <span>{savingProfile ? "Saving..." : "Save Changes"}</span>
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* TAB: APPEARANCE */}
            {activeTab === "appearance" && (
                <div className="settings-card">
                    <div className="card-section-head">
                        <h2>Interface Appearance</h2>
                        <p>Customize the visual theme for your Admin Portal. This setting is scoped exclusively to your Admin session.</p>
                    </div>

                    <div className="theme-options-grid">
                        {/* Light theme option */}
                        <div
                            className={`theme-card ${adminTheme === "light" ? "active" : ""}`}
                            onClick={() => setAdminTheme("light")}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="theme-preview-box light">
                                <div className="preview-sidebar" />
                                <div className="preview-content">
                                    <div className="preview-bar" />
                                    <div className="preview-rect" />
                                </div>
                            </div>
                            <div className="theme-card-footer">
                                <strong>Light Mode</strong>
                                {adminTheme === "light" && <span className="theme-badge">Active</span>}
                            </div>
                        </div>

                        {/* Dark theme option */}
                        <div
                            className={`theme-card ${adminTheme === "dark" ? "active" : ""}`}
                            onClick={() => setAdminTheme("dark")}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="theme-preview-box dark">
                                <div className="preview-sidebar" />
                                <div className="preview-content">
                                    <div className="preview-bar" />
                                    <div className="preview-rect" />
                                </div>
                            </div>
                            <div className="theme-card-footer">
                                <strong>Dark Mode</strong>
                                {adminTheme === "dark" && <span className="theme-badge">Active</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SECURITY */}
            {activeTab === "security" && (
                <div className="settings-card">
                    <div className="card-section-head">
                        <h2>Account Security</h2>
                        <p>Change your admin account password or send a recovery reset email.</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="settings-form">
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                            <span className="form-hint">Minimum 6 characters.</span>
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                            <button type="submit" className="submit-btn" disabled={updatingPassword}>
                                {updatingPassword ? <Loader2 size={16} className="spin-icon" /> : <KeyRound size={16} />}
                                <span>{updatingPassword ? "Updating..." : "Update Password"}</span>
                            </button>

                        
                        </div>
                    </form>
                </div>
            )}

            {/* TAB: APPLICATION INFO */}
            {activeTab === "info" && (
                <div className="settings-card">
                    <div className="card-section-head">
                        <h2>System Information</h2>
                        <p>Technical details, deployment metadata, and runtime architecture.</p>
                    </div>

                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Application</span>
                            <span className="info-val">{appInfo.appName}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Version</span>
                            <span className="info-val">{appInfo.version}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Environment</span>
                            <span className="info-val">{appInfo.environment}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Firebase Tier</span>
                            <span className="info-val">{appInfo.platformTier}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Project ID</span>
                            <span className="info-val">{appInfo.projectId}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Database</span>
                            <span className="info-val">{appInfo.database}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Authentication</span>
                            <span className="info-val">{appInfo.authProvider}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">PDF Engine</span>
                            <span className="info-val">{appInfo.pdfEngine}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">React Engine</span>
                            <span className="info-val">v{appInfo.reactVersion}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Build Tool</span>
                            <span className="info-val">{appInfo.buildTool}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Status</span>
                            <span className="info-val" style={{ color: "#16a34a" }}>● All Systems Operational</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Active Date</span>
                            <span className="info-val">{appInfo.lastDeployed}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
