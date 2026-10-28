import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase/firebase.js";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const tokenResult = await firebaseUser.getIdTokenResult();
                    let isAdminUser = tokenResult.claims.admin === true || tokenResult.claims.role === "admin";

                    // Check admin doc by UID
                    if (!isAdminUser) {
                        try {
                            const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
                            if (adminDoc.exists()) {
                                isAdminUser = true;
                            }
                        } catch (docErr) {
                            // Non-blocking
                        }
                    }

                    // Check admin doc by email
                    if (!isAdminUser && firebaseUser.email) {
                        try {
                            const q = query(collection(db, "admins"), where("email", "==", firebaseUser.email));
                            const qSnap = await getDocs(q);
                            if (!qSnap.empty) {
                                isAdminUser = true;
                            }
                        } catch (qErr) {
                            // Non-blocking
                        }
                    }

                    if (isAdminUser) {
                        const adminData = {
                            id: firebaseUser.uid,
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role: "admin"
                        };
                        setAdmin(adminData);
                        localStorage.setItem("admin_token", tokenResult.token);
                        localStorage.setItem("admin_user", JSON.stringify(adminData));
                    } else {
                        setAdmin(null);
                        localStorage.removeItem("admin_token");
                        localStorage.removeItem("admin_user");
                    }
                } catch (e) {
                    setAdmin(null);
                }
            } else {
                setAdmin(null);
                localStorage.removeItem("admin_token");
                localStorage.removeItem("admin_user");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (token, adminData) => {
        localStorage.setItem("admin_token", token);
        localStorage.setItem("admin_user", JSON.stringify(adminData));
        setAdmin(adminData);
    }, []);

    const logout = useCallback(async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.error("Admin sign out error:", e);
        }
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        setAdmin(null);
    }, []);

    const value = useMemo(
        () => ({
            admin,
            loading,
            login,
            logout
        }),
        [admin, loading, login, logout]
    );

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => {
    return useContext(AdminAuthContext);
};
