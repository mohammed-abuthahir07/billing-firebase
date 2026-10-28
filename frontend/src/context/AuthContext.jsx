import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync state with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Never treat the admin account as a regular user in the user portal
        if (firebaseUser.email?.toLowerCase() === 'admin@gmail.com') {
          setUser(null);
          setLoading(false);
          return;
        }

        // Also check Firestore admins collection (handles future admins)
        let isAdminAccount = false;
        try {
          const adminCheck = await getDoc(doc(db, 'admins', firebaseUser.uid));
          if (adminCheck.exists()) isAdminAccount = true;
        } catch (_) {}

        if (isAdminAccount) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData = userDoc.exists() ? userDoc.data() : {};

          // Auto-create Firestore user document if it doesn't exist yet
          if (!userDoc.exists()) {
            const newUserPayload = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email,
              role: 'user',
              createdAt: new Date().toISOString(),
              updatedAt: serverTimestamp(),
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUserPayload, { merge: true });
              await setDoc(doc(db, `users/${firebaseUser.uid}/profile/company`), {
                companyName: newUserPayload.name,
                alternateEmail: firebaseUser.email,
                updatedAt: serverTimestamp(),
              }, { merge: true });
              await setDoc(doc(db, `users/${firebaseUser.uid}/stats/dashboard`), {
                totalRevenue: 0, totalBills: 0, monthlySales: 0,
                yearlySales: 0, todaySales: 0, updatedAt: serverTimestamp(),
              }, { merge: true });
              userData = newUserPayload;
            } catch (createErr) {
              console.warn('Could not auto-create user document:', createErr.message);
            }
          }
          
          let profileImage = null;
          try {
            const profileDoc = await getDoc(doc(db, `users/${firebaseUser.uid}/profile/company`));
            if (profileDoc.exists()) {
              profileImage = profileDoc.data().profileImage || null;
            }
          } catch (profileErr) {
            // Non-blocking if profile does not exist yet
          }

          const token = await firebaseUser.getIdToken();
          localStorage.setItem('billing_token', token);

          const userObj = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            email: firebaseUser.email,
            avatar: profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || firebaseUser.displayName || 'User')}&backgroundColor=2563eb`,
            profile_image: profileImage,
            created_at: userData.createdAt || new Date().toISOString()
          };

          setUser(userObj);
          localStorage.setItem('billing_user', JSON.stringify(userObj));
        } catch (err) {
          console.warn("User profile document pending or rules syncing:", err.message);
          // Fallback user object from Auth directly so user is never blocked
          const fallbackUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            email: firebaseUser.email,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firebaseUser.displayName || 'User')}&backgroundColor=2563eb`,
            profile_image: null,
            created_at: new Date().toISOString()
          };
          setUser(fallbackUser);
          localStorage.setItem('billing_user', JSON.stringify(fallbackUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem('billing_token');
        localStorage.removeItem('billing_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      // Block admin account from logging in through the user portal
      if (email.trim().toLowerCase() === 'admin@gmail.com') {
        return {
          success: false,
          error: 'This is an admin account. Please use the Admin Portal to log in.',
          isAdmin: true,
        };
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Double-check: if somehow an admin doc exists for this user, block them
      try {
        const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
        if (adminDoc.exists()) {
          await signOut(auth);
          return {
            success: false,
            error: 'Admin accounts cannot log in here. Please use the Admin Portal.',
            isAdmin: true,
          };
        }
      } catch (_) {
        // Non-blocking — continue if check fails
      }

      const token = await firebaseUser.getIdToken();
      
      let userData = {};
      let profileImage = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) userData = userDoc.data();

        const profileDoc = await getDoc(doc(db, `users/${firebaseUser.uid}/profile/company`));
        if (profileDoc.exists()) profileImage = profileDoc.data().profileImage || null;
      } catch (e) {
        // Fallback gracefully if Firestore rules are still warming up
      }

      const userObj = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        name: userData.name || firebaseUser.displayName || email.split('@')[0],
        email: firebaseUser.email,
        avatar: profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || 'User')}&backgroundColor=2563eb`,
        profile_image: profileImage,
        created_at: userData.createdAt || new Date().toISOString()
      };

      setUser(userObj);
      localStorage.setItem('billing_token', token);
      localStorage.setItem('billing_user', JSON.stringify(userObj));

      setIsLoginModalOpen(false);
      setIsRegisterModalOpen(false);
      return { success: true };
    } catch (error) {
      console.error('Firebase Login error:', error);
      let message = 'Login failed. Please check your credentials.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid Email or Password';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later.';
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    try {
      const trimmedName = (name || '').trim();
      const trimmedEmail = (email || '').trim().toLowerCase();

      // Block admin email from registering as a user
      if (trimmedEmail === 'admin@gmail.com') {
        return {
          success: false,
          error: 'This email is reserved for the admin. Please use a different email.',
        };
      }

      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const firebaseUser = userCredential.user;
      
      try {
        await updateFirebaseProfile(firebaseUser, { displayName: trimmedName });
      } catch (e) {
        // Continue
      }

      const userPayload = {
        name: trimmedName,
        email: trimmedEmail,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };

      // Ensure Firestore user document, profile, and stats are initialized
      let firestoreReady = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), userPayload, { merge: true });
          await setDoc(doc(db, `users/${firebaseUser.uid}/profile/company`), {
            companyName: trimmedName,
            alternateEmail: trimmedEmail,
            updatedAt: serverTimestamp()
          }, { merge: true });
          await setDoc(doc(db, `users/${firebaseUser.uid}/stats/dashboard`), {
            totalRevenue: 0,
            totalBills: 0,
            monthlySales: 0,
            yearlySales: 0,
            todaySales: 0,
            updatedAt: serverTimestamp()
          }, { merge: true });
          firestoreReady = true;
          break;
        } catch (firestoreErr) {
          console.warn(`Firestore profile init attempt ${attempt + 1} retry:`, firestoreErr.message);
          await new Promise((res) => setTimeout(res, 200));
        }
      }

      const token = await firebaseUser.getIdToken();
      const userObj = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        name: trimmedName,
        email: trimmedEmail,
        role: 'user',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trimmedName || 'User')}&backgroundColor=2563eb`,
        profile_image: null,
        created_at: userPayload.createdAt
      };

      setUser(userObj);
      localStorage.setItem('billing_token', token);
      localStorage.setItem('billing_user', JSON.stringify(userObj));

      setIsLoginModalOpen(false);
      setIsRegisterModalOpen(false);
      return { success: true, user: userObj };
    } catch (error) {
      console.error('Firebase Registration error:', error);
      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email already exists. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.message) {
        message = error.message;
      }
      return { success: false, error: message };
    }
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('billing_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    }
    setUser(null);
    localStorage.removeItem('billing_user');
    localStorage.removeItem('billing_token');
    window.location.href = '/login';
  }, []);

  const openLoginModal = useCallback(() => {
    setIsLoginModalOpen(true);
    setIsRegisterModalOpen(false);
  }, []);

  const openRegisterModal = useCallback(() => {
    setIsRegisterModalOpen(true);
    setIsLoginModalOpen(false);
  }, []);

  const closeModals = useCallback(() => {
    setIsLoginModalOpen(false);
    setIsRegisterModalOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
      isLoginModalOpen,
      isRegisterModalOpen,
      openLoginModal,
      openRegisterModal,
      closeModals,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      isLoginModalOpen,
      isRegisterModalOpen,
      openLoginModal,
      openRegisterModal,
      closeModals,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
