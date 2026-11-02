import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Building2,
  Mail,
  Phone,
  FileText,
  Globe,
  MapPin,
  Hash,
  Camera,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  getProfile,
  updateProfile,
  uploadProfileImage,
  getAvatarUrl,
} from "../../services/profileService";
import { useAuth } from "../../context/AuthContext";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Business fields
  const [companyName, setCompanyName] = useState("");
  const [mobile, setMobile] = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [website, setWebsite] = useState("");

  // Address fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [country, setCountry] = useState("");
  const [pincode, setPincode] = useState("");

  // Profile image
  const [profileImage, setProfileImage] = useState("");

  // Inline field validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  const avatarSrc = profileImage || getAvatarUrl(name, email);

  // Load profile details from Firebase
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProfile();

      setName(data.user?.name || "");
      setEmail(data.user?.email || "");

      const p = data.profile || {};
      setCompanyName(p.company_name || "");
      setMobile(p.mobile || "");
      setAlternateEmail(p.alternate_email || "");
      setGstNumber(p.gst_number || "");
      setWebsite(p.website || "");
      setAddress(p.address || "");
      setCity(p.city || "");
      setStateName(p.state || "");
      setCountry(p.country || "");
      setPincode(p.pincode || "");

      const img = p.profile_image || "";
      setProfileImage(img);
      if (img && updateUser) {
        updateUser({ avatar: img });
      }
    } catch (err) {
      setError("Unable to load profile data. Please refresh and try again.");
      console.error("[Profile] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Validation function
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = "Full Name is required.";
    }

    if (alternateEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(alternateEmail.trim())) {
        errors.alternateEmail = "Please enter a valid email address.";
      }
    }

    if (mobile.trim()) {
      const phoneDigits = mobile.replace(/[^0-9]/g, "");
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        errors.mobile = "Please enter a valid mobile number (7-15 digits).";
      }
    }

    if (gstNumber.trim()) {
      const cleanGST = gstNumber.trim().toUpperCase();
      // Indian GSTIN format standard 15 alphanumeric characters
      if (cleanGST.length !== 15) {
        errors.gstNumber = "GSTIN should be 15 alphanumeric characters.";
      }
    }

    if (website.trim()) {
      try {
        const urlToTest = website.startsWith("http") ? website : `https://${website}`;
        new URL(urlToTest);
      } catch (_) {
        errors.website = "Please enter a valid website URL.";
      }
    }

    if (pincode.trim()) {
      const pinDigits = pincode.replace(/[^0-9]/g, "");
      if (pinDigits.length < 3 || pinDigits.length > 10) {
        errors.pincode = "Please enter a valid postal/PIN code.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError("Please fix the highlighted errors before saving.");
      return;
    }

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await updateProfile({
        name: name.trim(),
        company_name: companyName.trim(),
        mobile: mobile.trim(),
        alternate_email: alternateEmail.trim(),
        gst_number: gstNumber.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        country: country.trim(),
        pincode: pincode.trim(),
        website: website.trim(),
        ...(profileImage && !profileImage.includes("dicebear")
          ? { profile_image: profileImage }
          : {}),
      });

      // Update state
      setName(response.user?.name || name);
      setEmail(response.user?.email || email);

      const rp = response.profile || {};
      setCompanyName(rp.company_name || "");
      setMobile(rp.mobile || "");
      setAlternateEmail(rp.alternate_email || "");
      setGstNumber(rp.gst_number || "");
      setAddress(rp.address || "");
      setCity(rp.city || "");
      setStateName(rp.state || "");
      setCountry(rp.country || "");
      setPincode(rp.pincode || "");
      setWebsite(rp.website || "");

      // Update context and localStorage
      if (updateUser) {
        updateUser({
          name: response.user?.name || name,
          avatar: profileImage || getAvatarUrl(name, email),
        });
      }

      setSuccess("Profile and company details updated successfully!");
      timeoutRef.current = setTimeout(() => {
        setSuccess("");
      }, 5000);
    } catch (err) {
      setError(err.message || "Failed to update profile. Please try again.");
      console.error("[Profile] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Profile Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds 5 MB. Please select a smaller photo.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const data = await uploadProfileImage(file);
      const imgUrl = data.profile_image;

      setProfileImage(imgUrl);
      if (updateUser) {
        updateUser({ avatar: imgUrl });
      }

      setSuccess("Profile photo updated successfully!");
      timeoutRef.current = setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to upload image. Please try again.");
      console.error("[Profile] upload error:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-loading-box">
          <Loader2 size={36} className="spin-icon" color="#2563eb" />
          <p>Loading business profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      {/* Header */}
      <header className="profile-page-header">
        <div>
          <span className="profile-kicker">
            <Building2 size={13} /> Account &amp; Business Profile
          </span>
          <h1 className="profile-page-title">Profile Management</h1>
          <p className="profile-page-subtitle">
            Update your personal credentials, contact details, and official company billing information.
          </p>
        </div>
        <button
          type="button"
          className="back-to-dashboard-btn"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </header>

      {/* Alerts */}
      {success && (
        <div className="profile-alert success" role="alert">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="profile-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Hero / Avatar Section Card */}
      <section className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="avatar-container">
            <img
              src={avatarSrc}
              alt="User Avatar"
              className="profile-avatar-img"
              loading="lazy"
              decoding="async"
              onError={(ev) => {
                ev.target.onerror = null;
                ev.target.src = getAvatarUrl(name, email);
              }}
            />
            <button
              type="button"
              className={`avatar-upload-trigger ${uploading ? "disabled" : ""}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
              title={uploading ? "Uploading..." : "Change photo"}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 size={15} className="spin-icon" />
              ) : (
                <Camera size={15} />
              )}
            </button>
          </div>

          <div className="profile-hero-details">
            <h2>{name || "Business User"}</h2>
            <div className="profile-hero-meta">
              <span className="profile-email-badge">
                <Mail size={14} /> {email || "No email"}
              </span>
              <span className="profile-status-pill">
                <ShieldCheck size={14} /> Active Business Account
              </span>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
          <button
            type="button"
            className="change-photo-btn"
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={15} className="spin-icon" /> Uploading...
              </>
            ) : (
              <>
                <Camera size={15} /> Upload Photo
              </>
            )}
          </button>
          <span className="photo-hint">JPG, PNG, WEBP (Max 5 MB)</span>
        </div>
      </section>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="profile-form">
        {/* SECTION 1: ACCOUNT CREDENTIALS */}
        <div className="profile-section-card">
          <div className="section-card-head">
            <div className="section-icon-badge">
              <User size={20} />
            </div>
            <div>
              <h3>Account Credentials</h3>
              <p>Your primary user identity registered with Billing SaaS.</p>
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="profile-field">
              <label>
                Full Name <span className="req">*</span>
              </label>
              <div className="field-input-box">
                <User size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
                  }}
                  className={fieldErrors.name ? "has-error" : ""}
                  required
                />
              </div>
              {fieldErrors.name && (
                <span className="field-error-text">{fieldErrors.name}</span>
              )}
            </div>

            <div className="profile-field">
              <label>
                Registered Login Email
              </label>
              <div className="field-input-box">
                <Lock size={16} className="field-icon" />
                <input
                  type="email"
                  value={email}
                  disabled
                />
              </div>
              <span className="field-hint-text">
                Your authentication login email cannot be changed directly.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: BUSINESS & CONTACT INFO */}
        <div className="profile-section-card">
          <div className="section-card-head">
            <div className="section-icon-badge">
              <Building2 size={20} />
            </div>
            <div>
              <h3>Business &amp; Company Details</h3>
              <p>Legal business identity printed on your issued bills and tax invoices.</p>
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="profile-field">
              <label>Company / Trade Name</label>
              <div className="field-input-box">
                <Building2 size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. Acme Enterprises Pvt Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>GSTIN / Tax Identification</label>
              <div className="field-input-box">
                <FileText size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  value={gstNumber}
                  maxLength={15}
                  onChange={(e) => {
                    setGstNumber(e.target.value.toUpperCase());
                    if (fieldErrors.gstNumber) setFieldErrors({ ...fieldErrors, gstNumber: null });
                  }}
                  className={fieldErrors.gstNumber ? "has-error" : ""}
                />
              </div>
              {fieldErrors.gstNumber ? (
                <span className="field-error-text">{fieldErrors.gstNumber}</span>
              ) : (
                <span className="field-hint-text">15-digit GST identification number.</span>
              )}
            </div>

            <div className="profile-field">
              <label>Business Mobile Number</label>
              <div className="field-input-box">
                <Phone size={16} className="field-icon" />
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (fieldErrors.mobile) setFieldErrors({ ...fieldErrors, mobile: null });
                  }}
                  className={fieldErrors.mobile ? "has-error" : ""}
                />
              </div>
              {fieldErrors.mobile && (
                <span className="field-error-text">{fieldErrors.mobile}</span>
              )}
            </div>

            <div className="profile-field">
              <label>Alternate / Billing Email</label>
              <div className="field-input-box">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  placeholder="e.g. billing@company.com"
                  value={alternateEmail}
                  onChange={(e) => {
                    setAlternateEmail(e.target.value);
                    if (fieldErrors.alternateEmail) setFieldErrors({ ...fieldErrors, alternateEmail: null });
                  }}
                  className={fieldErrors.alternateEmail ? "has-error" : ""}
                />
              </div>
              {fieldErrors.alternateEmail && (
                <span className="field-error-text">{fieldErrors.alternateEmail}</span>
              )}
            </div>

            <div className="profile-field span-full">
              <label>Official Website</label>
              <div className="field-input-box">
                <Globe size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. https://www.yourcompany.com"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    if (fieldErrors.website) setFieldErrors({ ...fieldErrors, website: null });
                  }}
                  className={fieldErrors.website ? "has-error" : ""}
                />
              </div>
              {fieldErrors.website && (
                <span className="field-error-text">{fieldErrors.website}</span>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: REGISTERED ADDRESS */}
        <div className="profile-section-card">
          <div className="section-card-head">
            <div className="section-icon-badge">
              <MapPin size={20} />
            </div>
            <div>
              <h3>Registered Business Address</h3>
              <p>Official address included in header details of generated invoice PDFs.</p>
            </div>
          </div>

          <div className="profile-field">
            <label>Street Address</label>
            <div className="field-input-box">
              <MapPin size={16} className="field-icon" style={{ top: 14 }} />
              <textarea
                rows={2}
                placeholder="Suite, building number, street name or industrial area"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="profile-grid-4">
            <div className="profile-field">
              <label>City</label>
              <div className="field-input-box no-icon">
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>State</label>
              <div className="field-input-box no-icon">
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>Country</label>
              <div className="field-input-box no-icon">
                <input
                  type="text"
                  placeholder="e.g. India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>Postal / PIN Code</label>
              <div className="field-input-box">
                <Hash size={15} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. 400001"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    if (fieldErrors.pincode) setFieldErrors({ ...fieldErrors, pincode: null });
                  }}
                  className={fieldErrors.pincode ? "has-error" : ""}
                />
              </div>
              {fieldErrors.pincode && (
                <span className="field-error-text">{fieldErrors.pincode}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="profile-actions-bar">
          <button
            type="button"
            className="profile-cancel-btn"
            onClick={() => navigate("/dashboard")}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="profile-submit-btn"
            disabled={saving || uploading}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="spin-icon" /> Saving Profile...
              </>
            ) : (
              <>
                <Save size={16} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
