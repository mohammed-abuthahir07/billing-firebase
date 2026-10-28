import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import { db, auth } from "../firebase/firebase";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a File object to a base64 data-URL string (≤ 500 KB after resize).
 * We draw onto a canvas and compress to JPEG to keep Firestore doc size small.
 */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const MAX_SIDE = 256; // pixels — enough for an avatar
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(MAX_SIDE / img.width, MAX_SIDE / img.height);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Generate a DiceBear initials avatar URL as the fallback.
 */
export const getAvatarUrl = (name, email) => {
  const seed = name || email?.split("@")[0] || "User";
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=2563eb`;
};

// ─── GET Profile ─────────────────────────────────────────────────────────────

export const getProfile = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const userSnap    = await getDoc(doc(db, "users", user.uid));
  const userData    = userSnap.exists() ? userSnap.data() : {};

  const profileSnap = await getDoc(doc(db, `users/${user.uid}/profile/company`));
  const profileData = profileSnap.exists() ? profileSnap.data() : null;

  const displayName = userData.name || user.displayName || user.email?.split("@")[0];

  return {
    success: true,
    user: {
      id:         user.uid,
      name:       displayName,
      email:      user.email,
      created_at: userData.createdAt || new Date().toISOString(),
    },
    profile: {
      id:              user.uid,
      user_id:         user.uid,
      company_name:    profileData?.companyName    || "",
      mobile:          profileData?.mobile         || "",
      alternate_email: profileData?.alternateEmail || "",
      gst_number:      profileData?.gstNumber      || "",
      address:         profileData?.address        || "",
      city:            profileData?.city           || "",
      state:           profileData?.state          || "",
      country:         profileData?.country        || "",
      pincode:         profileData?.pincode        || "",
      website:         profileData?.website        || "",
      // profileImage can be a base64 data-URL or a Firebase Storage URL
      profile_image:   profileData?.profileImage   || null,
      created_at:      profileData?.createdAt      || new Date().toISOString(),
    },
  };
};

// ─── UPDATE Profile ───────────────────────────────────────────────────────────

export const updateProfile = async (userData) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Update Firebase Auth display name
  if (userData.name) {
    await updateFirebaseProfile(user, { displayName: userData.name });
    await updateDoc(doc(db, "users", user.uid), {
      name:      userData.name,
      updatedAt: serverTimestamp(),
    });
  }

  const companyData = {
    companyName:    userData.company_name    || userData.companyName    || "",
    mobile:         userData.mobile          || "",
    alternateEmail: userData.alternate_email || userData.alternateEmail || "",
    gstNumber:      userData.gst_number      || userData.gstNumber      || "",
    address:        userData.address         || "",
    city:           userData.city            || "",
    state:          userData.state           || "",
    country:        userData.country         || "",
    pincode:        userData.pincode         || "",
    website:        userData.website         || "",
    // Keep existing profileImage if caller doesn't pass one
    ...(userData.profile_image !== undefined && {
      profileImage: userData.profile_image,
    }),
    updatedAt: serverTimestamp(),
  };

  await setDoc(
    doc(db, `users/${user.uid}/profile/company`),
    companyData,
    { merge: true }
  );

  return {
    success: true,
    message: "Profile updated successfully",
    user: {
      id:    user.uid,
      name:  userData.name || user.displayName,
      email: user.email,
    },
    profile: {
      id:              user.uid,
      user_id:         user.uid,
      company_name:    companyData.companyName,
      mobile:          companyData.mobile,
      alternate_email: companyData.alternateEmail,
      gst_number:      companyData.gstNumber,
      address:         companyData.address,
      city:            companyData.city,
      state:           companyData.state,
      country:         companyData.country,
      pincode:         companyData.pincode,
      website:         companyData.website,
      profile_image:   companyData.profileImage ?? null,
    },
  };
};

// ─── UPLOAD Profile Image (base64 → Firestore, no Storage needed) ─────────────

export const uploadProfileImage = async (file) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  // Resize + convert to base64 JPEG
  const base64 = await fileToBase64(file);

  // Persist to Firestore profile doc
  await setDoc(
    doc(db, `users/${user.uid}/profile/company`),
    { profileImage: base64, updatedAt: serverTimestamp() },
    { merge: true }
  );

  return {
    success: true,
    message: "Profile image updated successfully",
    profile_image: base64,
  };
};
