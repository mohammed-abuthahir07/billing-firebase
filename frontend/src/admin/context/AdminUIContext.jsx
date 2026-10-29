import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

const AdminUIContext = createContext();

export const AdminUIProvider = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [adminTheme, setAdminThemeState] = useState(() => {
        try {
            return localStorage.getItem("admin_theme") || "light";
        } catch {
            return "light";
        }
    });

    const setAdminTheme = useCallback((newTheme) => {
        const theme = newTheme === "dark" ? "dark" : "light";
        setAdminThemeState(theme);
        try {
            localStorage.setItem("admin_theme", theme);
        } catch (_) {}
    }, []);

    const toggleAdminTheme = useCallback(() => {
        setAdminTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, [setAdminTheme]);

    const value = useMemo(
        () => ({
            isMobileMenuOpen,
            setIsMobileMenuOpen,
            adminTheme,
            setAdminTheme,
            toggleAdminTheme,
        }),
        [isMobileMenuOpen, adminTheme, setAdminTheme, toggleAdminTheme]
    );

    return (
        <AdminUIContext.Provider value={value}>
            {children}
        </AdminUIContext.Provider>
    );
};

export const useAdminUI = () => {
    return useContext(AdminUIContext);
};
