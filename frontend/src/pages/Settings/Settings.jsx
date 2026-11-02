import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Info,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Server,
  Layers,
  Activity,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  getUserSettingsProfile,
  updateUserSettingsDisplayName,
  changeUserPassword,
  getUserAppInformation,
} from "../../services/settingsService";
import { getAvatarUrl } from "../../services/profileService";
import { useAuth } from "../../context/AuthContext";
import "./Settings.css";

const Settings = () => {
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState("profile");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile fields
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountCreatedAt, setAccountCreatedAt] = useState("");
  const [userId, setUserId] = useState("");
  const [lastSignIn, setLastSignIn] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Copy UID feedback
  const [copiedUid, setCopiedUid] = useState(false);

  // Notifications
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const data = await getUserSettingsProfile();
        setEmail(data.email || "");
        setDisplayName(data.displayName || "");
        setAccountCreatedAt(
          data.createdAt
            ? new Date(data.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Active"
        );
        setUserId(data.uid || "");
        setLastSignIn(
          data.lastSignInTime
            ? new Date(data.lastSignInTime).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Recent"
        );
      } catch (err) {
        console.error("Failed to load user settings:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleCopyUid = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("error", "Display name cannot be empty.");
      return;
    }

    try {
      setSavingProfile(true);
      await updateUserSettingsDisplayName(displayName);
      if (updateUser) {
        updateUser({ name: displayName.trim() });
      }
      showToast("success", "Account display name updated successfully.");
    } catch (err) {
      showToast("error", err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast("error", "Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      showToast("error", "New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("error", "New password and confirmation do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);
      await changeUserPassword(currentPassword, newPassword);
      showToast("success", "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast("error", err.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const appInfo = getUserAppInformation();
  const avatarSrc = user?.avatar || getAvatarUrl(displayName || user?.name, email || user?.email);

  // Password validation indicators
  const hasMinLength = newPassword.length >= 6;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="settings-page">
      {/* Page Header */}
      <header className="settings-header">
        <div className="settings-header-left">
          <span className="settings-kicker">
            <SettingsIcon size={13} /> Account Preferences
          </span>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">
            Manage your personal profile, credentials, security protocols, and system diagnostics.
          </p>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className={`settings-toast ${toast.type}`} role="alert">
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Account Hero Card */}
      <div className="settings-user-hero">
        <div className="settings-hero-left">
          <div className="settings-avatar-wrapper">
            <img
              src={avatarSrc}
              alt={displayName || "User"}
              className="settings-user-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getAvatarUrl(displayName, email);
              }}
            />
            <span className="settings-avatar-badge" title="Active Account">
              <ShieldCheck size={14} />
            </span>
          </div>
          <div className="settings-user-meta">
            <div className="settings-user-title-row">
              <h2 className="settings-user-name">{displayName || "Billing User"}</h2>
              <span className="settings-plan-pill">
                <Sparkles size={12} /> Spark Free Tier
              </span>
            </div>
            <p className="settings-user-email">
              <Mail size={13} /> {email || "No email available"}
            </p>
            <div className="settings-user-tags">
              <span className="settings-tag status-active">
                <span className="pulsing-dot" /> Active Account
              </span>
              <span className="settings-tag">
                <Calendar size={12} /> Joined {accountCreatedAt || "Recently"}
              </span>
            </div>
          </div>
        </div>

        <div className="settings-hero-right">
          <Link to="/profile" className="settings-profile-link-btn">
            <span>Manage Business Profile</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Segmented Pill Tabs Navigation */}
      <div className="settings-tabs-container">
        <div className="settings-segmented-tabs" role="tablist">
          <button
            className={`segmented-tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
            role="tab"
            aria-selected={activeTab === "profile"}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <button
            className={`segmented-tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
            role="tab"
            aria-selected={activeTab === "security"}
          >
            <Lock size={16} />
            <span>Security</span>
          </button>
          <button
            className={`segmented-tab-btn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
            role="tab"
            aria-selected={activeTab === "info"}
          >
            <Info size={16} />
            <span>Application Info</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          TAB 1: PROFILE
          ========================================================= */}
      {activeTab === "profile" && (
        <div className="settings-grid-layout" role="tabpanel">
          {/* Main Profile Form */}
          <div className="settings-panel-card">
            <div className="panel-card-header">
              <div className="panel-icon-pill">
                <User size={18} />
              </div>
              <div>
                <h2 className="panel-title">User Account Profile</h2>
                <p className="panel-subtitle">
                  Update your personal account display name and identity details.
                </p>
              </div>
            </div>

            {loadingProfile ? (
              <div className="settings-loading-state">
                <Loader2 size={24} className="spin-icon" />
                <span>Loading profile credentials...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="settings-modern-form">
                <div className="form-field-group">
                  <label className="field-label">
                    Email Address
                    <span className="field-badge-readonly">Managed via Firebase</span>
                  </label>
                  <div className="input-with-icon readonly-field">
                    <Mail size={16} className="field-lead-icon" />
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="modern-input"
                      readOnly
                    />
                    <Lock size={14} className="field-end-lock" />
                  </div>
                  <span className="field-caption">
                    Your primary authentication email cannot be changed directly from the dashboard.
                  </span>
                </div>

                <div className="form-field-group">
                  <label className="field-label">
                    Full Display Name <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <User size={16} className="field-lead-icon" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="modern-input"
                      required
                    />
                  </div>
                  <span className="field-caption">
                    This name will appear on the navigation bar, greeting headers, and exported invoices.
                  </span>
                </div>

                <div className="form-action-row">
                  <button type="submit" className="settings-submit-btn" disabled={savingProfile}>
                    {savingProfile ? (
                      <>
                        <Loader2 size={16} className="spin-icon" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Sidebar: Account Metadata */}
          <div className="settings-sidebar-stack">
            <div className="settings-meta-card">
              <h3 className="meta-card-title">
                <ShieldCheck size={16} /> Account Overview
              </h3>

              <div className="meta-info-list">
                <div className="meta-info-row">
                  <span className="meta-label">Account Status</span>
                  <span className="meta-value status-pill-active">
                    <span className="pulsing-dot" /> Active Account
                  </span>
                </div>

                <div className="meta-info-row">
                  <span className="meta-label">Member Since</span>
                  <span className="meta-value">{accountCreatedAt || "Active"}</span>
                </div>

                <div className="meta-info-row">
                  <span className="meta-label">Last Sign In</span>
                  <span className="meta-value">{lastSignIn || "Today"}</span>
                </div>

                <div className="meta-info-row">
                  <span className="meta-label">Account UID</span>
                  <div className="meta-uid-copy">
                    <span className="uid-text">
                      {userId ? `${userId.substring(0, 10)}...` : "Authenticated"}
                    </span>
                    <button
                      type="button"
                      className="uid-copy-btn"
                      onClick={handleCopyUid}
                      title="Copy full UID"
                    >
                      {copiedUid ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-quick-banner">
              <div className="quick-banner-icon">
                <ExternalLink size={20} />
              </div>
              <div className="quick-banner-content">
                <h4>Company &amp; Billing Details</h4>
                <p>
                  Looking to update GSTIN, company address, phone number or invoice logo?
                </p>
                <Link to="/profile" className="banner-link">
                  Open Business Profile →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: SECURITY
          ========================================================= */}
      {activeTab === "security" && (
        <div className="settings-grid-layout" role="tabpanel">
          {/* Main Password Change Form */}
          <div className="settings-panel-card">
            <div className="panel-card-header">
              <div className="panel-icon-pill">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="panel-title">Change Account Password</h2>
                <p className="panel-subtitle">
                  Ensure your account uses a secure password to prevent unauthorized access.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="settings-modern-form">
              <div className="form-field-group">
                <label className="field-label">
                  Current Password <span className="required-star">*</span>
                </label>
                <div className="input-with-icon password-input-box">
                  <KeyRound size={16} className="field-lead-icon" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="modern-input"
                    required
                  />
                  <button
                    type="button"
                    className="password-reveal-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="field-caption">
                  Required to verify your authorization before applying changes.
                </span>
              </div>

              <div className="form-field-group">
                <label className="field-label">
                  New Password <span className="required-star">*</span>
                </label>
                <div className="input-with-icon password-input-box">
                  <Lock size={16} className="field-lead-icon" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    className="modern-input"
                    required
                  />
                  <button
                    type="button"
                    className="password-reveal-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-field-group">
                <label className="field-label">
                  Confirm New Password <span className="required-star">*</span>
                </label>
                <div className="input-with-icon password-input-box">
                  <ShieldCheck size={16} className="field-lead-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    minLength={6}
                    className="modern-input"
                    required
                  />
                  <button
                    type="button"
                    className="password-reveal-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Real-time Checklist */}
              {newPassword.length > 0 && (
                <div className="password-checklist">
                  <div className={`check-item ${hasMinLength ? "valid" : "invalid"}`}>
                    {hasMinLength ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`check-item ${passwordsMatch ? "valid" : "invalid"}`}>
                    {passwordsMatch ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>Passwords match</span>
                  </div>
                </div>
              )}

              <div className="form-action-row">
                <button
                  type="submit"
                  className="settings-submit-btn"
                  disabled={updatingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Security Guidance */}
          <div className="settings-sidebar-stack">
            <div className="settings-meta-card">
              <h3 className="meta-card-title">
                <ShieldAlert size={16} /> Security Standards
              </h3>

              <div className="security-tips-list">
                <div className="tip-box">
                  <strong>Firebase Authenticated</strong>
                  <p>
                    All password updates are verified directly against Firebase Authentication
                    credential services.
                  </p>
                </div>
                <div className="tip-box">
                  <strong>Password Requirements</strong>
                  <p>
                    Must be at least 6 characters long. Use a combination of letters, numbers, and
                    symbols for maximum safety.
                  </p>
                </div>
                <div className="tip-box">
                  <strong>Session Security</strong>
                  <p>
                    Updating your password secures your active session across all devices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: APPLICATION INFO
          ========================================================= */}
      {activeTab === "info" && (
        <div className="settings-info-layout" role="tabpanel">
          {/* Card 1: Cloud & Backend Infrastructure */}
          <div className="info-deck-card">
            <div className="info-deck-header">
              <div className="info-deck-icon blue">
                <Server size={18} />
              </div>
              <div>
                <h3 className="info-deck-title">Cloud Infrastructure</h3>
                <p className="info-deck-sub">Google Firebase Spark services &amp; database</p>
              </div>
            </div>

            <div className="info-deck-grid">
              <div className="deck-item">
                <span className="deck-label">Platform Tier</span>
                <span className="deck-val badge-tier">{appInfo.platformTier}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Project ID</span>
                <span className="deck-val mono">{appInfo.projectId}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Database Engine</span>
                <span className="deck-val">{appInfo.database}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Authentication</span>
                <span className="deck-val">{appInfo.authProvider}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Frontend & Runtime Stack */}
          <div className="info-deck-card">
            <div className="info-deck-header">
              <div className="info-deck-icon emerald">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="info-deck-title">Frontend &amp; Runtime</h3>
                <p className="info-deck-sub">Client application framework and libraries</p>
              </div>
            </div>

            <div className="info-deck-grid">
              <div className="deck-item">
                <span className="deck-label">Framework</span>
                <span className="deck-val">React {appInfo.reactVersion}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Build Engine</span>
                <span className="deck-val">{appInfo.buildTool}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">PDF Generator</span>
                <span className="deck-val">{appInfo.pdfEngine}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Icon System</span>
                <span className="deck-val">Lucide React</span>
              </div>
            </div>
          </div>

          {/* Card 3: System Status & Health */}
          <div className="info-deck-card">
            <div className="info-deck-header">
              <div className="info-deck-icon purple">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="info-deck-title">Deployment &amp; Status</h3>
                <p className="info-deck-sub">Application versioning and runtime metrics</p>
              </div>
            </div>

            <div className="info-deck-grid">
              <div className="deck-item">
                <span className="deck-label">Application</span>
                <span className="deck-val">{appInfo.appName}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Version</span>
                <span className="deck-val mono">v{appInfo.version}</span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Operational State</span>
                <span className="deck-val status-live">
                  <span className="pulsing-dot" /> {appInfo.status}
                </span>
              </div>
              <div className="deck-item">
                <span className="deck-label">Build Target</span>
                <span className="deck-val">{appInfo.environment}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
