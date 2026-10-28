import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Save,
  X,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { getProfile, updateProfile, uploadProfileImage, getAvatarUrl } from "../../services/profileService";
import { useAuth } from "../../context/AuthContext";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { updateUser, user: authUser } = useAuth();
  const fileInputRef = useRef(null);
  const timeoutRef  = useRef(null);

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success,   setSuccess]   = useState("");
  const [error,     setError]     = useState("");

  // User fields
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");

  // Profile / company fields
  const [companyName,    setCompanyName]    = useState("");
  const [mobile,         setMobile]         = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [gstNumber,      setGstNumber]      = useState("");
  const [website,        setWebsite]        = useState("");
  const [address,        setAddress]        = useState("");
  const [city,           setCity]           = useState("");
  const [stateName,      setStateName]      = useState("");
  const [country,        setCountry]        = useState("");
  const [pincode,        setPincode]        = useState("");

  // Avatar: can be base64, https:// URL, or empty (→ DiceBear fallback)
  const [profileImage, setProfileImage] = useState("");

  // ── Derived: what to show in the <img> ──────────────────────────────────────
  const avatarSrc = profileImage || getAvatarUrl(name, email);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();

      setName(data.user?.name  || "");
      setEmail(data.user?.email || "");

      const p = data.profile || {};
      setCompanyName(p.company_name    || "");
      setMobile(p.mobile               || "");
      setAlternateEmail(p.alternate_email || "");
      setGstNumber(p.gst_number        || "");
      setWebsite(p.website             || "");
      setAddress(p.address             || "");
      setCity(p.city                   || "");
      setStateName(p.state             || "");
      setCountry(p.country             || "");
      setPincode(p.pincode             || "");

      // profile_image is a base64 or a Firebase Storage URL
      const img = p.profile_image || "";
      setProfileImage(img);
      if (img) updateUser({ avatar: img });
    } catch (err) {
      setError("Unable to load profile. Please try again.");
      console.error("[Profile] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await updateProfile({
        name,
        company_name:    companyName,
        mobile,
        alternate_email: alternateEmail,
        gst_number:      gstNumber,
        address,
        city,
        state:           stateName,
        country,
        pincode,
        website,
        // Only include profile_image if it was changed (not the DiceBear URL)
        ...(profileImage && !profileImage.includes("dicebear")
          ? { profile_image: profileImage }
          : {}),
      });

      // Sync state from response
      setName(response.user?.name  || name);
      setEmail(response.user?.email || email);

      const rp = response.profile || {};
      setCompanyName(rp.company_name    || "");
      setMobile(rp.mobile               || "");
      setAlternateEmail(rp.alternate_email || "");
      setGstNumber(rp.gst_number        || "");
      setAddress(rp.address             || "");
      setCity(rp.city                   || "");
      setStateName(rp.state             || "");
      setCountry(rp.country             || "");
      setPincode(rp.pincode             || "");
      setWebsite(rp.website             || "");

      // Update local storage + auth context
      const stored = JSON.parse(localStorage.getItem("billing_user") || "{}");
      localStorage.setItem("billing_user", JSON.stringify({
        ...stored,
        name: response.user?.name || name,
        avatar: profileImage || getAvatarUrl(name, email),
      }));
      updateUser({ name: response.user?.name || name });

      setSuccess(response.message || "Profile updated successfully!");
      timeoutRef.current = setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      setError("Failed to update profile. Please try again.");
      console.error("[Profile] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Image Upload ──────────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      const data = await uploadProfileImage(file);
      const imgUrl = data.profile_image;

      setProfileImage(imgUrl);
      updateUser({ avatar: imgUrl });

      // Also update local storage avatar
      const stored = JSON.parse(localStorage.getItem("billing_user") || "{}");
      localStorage.setItem("billing_user", JSON.stringify({ ...stored, avatar: imgUrl }));
    } catch (err) {
      setError(err.message || "Image upload failed. Please try a smaller image.");
      console.error("[Profile] upload error:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="profile-loading">
        <Loader2 size={40} className="spin-icon" />
        <p>Fetching profile details...</p>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">

        {/* Close button */}
        <button
          type="button"
          className="close-profile-btn"
          onClick={() => navigate("/dashboard")}
          title="Back to Dashboard"
          aria-label="Close Profile"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="profile-header animate-slide-up">
          <div className="header-text">
            <p className="page-kicker">
              <User size={14} />
              Account
            </p>
            <h2>Profile Management</h2>
            <p>Update your personal and business details below.</p>
          </div>
        </div>

        {/* Notifications */}
        {success && (
          <div className="alert-box success-box">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="alert-box error-box">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form animate-slide-up delay-2">

          {/* Avatar Section */}
          <div className="profile-image-section animate-slide-up delay-1">
            <div className="avatar-wrapper">
              <img
                src={avatarSrc}
                alt="Profile Avatar"
                className="profile-image"
                onError={(ev) => {
                  ev.target.onerror = null;
                  ev.target.src = getAvatarUrl(name, email);
                }}
              />
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
              <div
                className="avatar-badge"
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{ cursor: uploading ? "not-allowed" : "pointer" }}
                title={uploading ? "Uploading…" : "Change photo"}
              >
                {uploading
                  ? <Loader2 size={14} className="spin-icon" />
                  : <Camera size={14} />
                }
              </div>
            </div>
            <div className="avatar-info">
              <h4>{name || "User Profile"}</h4>
              <p>{email || "No email attached"}</p>
            </div>
          </div>

          {/* Account Credentials */}
          <div className="form-section-title">Account Credentials</div>

          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <div className="input-box">
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="form-section-title">Business &amp; Contact Info</div>

          <div className="form-grid">
            <div className="form-group">
              <label>Company Name</label>
              <div className="input-box">
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <div className="input-box">
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Alternate Email</label>
              <div className="input-box">
                <input
                  type="email"
                  placeholder="billing@company.com"
                  value={alternateEmail}
                  onChange={(e) => setAlternateEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>GST Number</label>
              <div className="input-box">
                <input
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group span-2">
              <label>Website URL</label>
              <div className="input-box">
                <input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="form-section-title">Address &amp; Location</div>

          <div className="form-group">
            <label>Street Address</label>
            <div className="input-box textarea-box">
              <textarea
                rows="2"
                placeholder="Suite / Floor, Street Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid quad-grid">
            <div className="form-group">
              <label>City</label>
              <div className="input-box simple-input">
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>State</label>
              <div className="input-box simple-input">
                <input
                  type="text"
                  placeholder="State"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Country</label>
              <div className="input-box simple-input">
                <input
                  type="text"
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Pincode</label>
              <div className="input-box simple-input">
                <input
                  type="text"
                  placeholder="600001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
