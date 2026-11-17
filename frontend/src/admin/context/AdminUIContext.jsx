import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
    ADMIN_THEME_KEY,
    readAdminTheme,
    resolveTheme,
    systemPrefersDark,
    writeThemePreference,
} from "../../theme/themePreference";

const AdminUIContext = createContext();

export const AdminUIProvider = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [adminTheme, setAdminThemeState] = useState(readAdminTheme);
    const [systemIsDark, setSystemIsDark] = useState(systemPrefersDark);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const sync = () => setSystemIsDark(media.matches);
        sync();
        media.addEventListener("change", sync);
        return () => media.removeEventListener("change", sync);
    }, []);

    const setAdminTheme = useCallback((newTheme) => {
        const theme = newTheme === "dark" || newTheme === "system" ? newTheme : "light";
        setAdminThemeState(theme);
        writeThemePreference(ADMIN_THEME_KEY, theme);
    }, []);

    const toggleAdminTheme = useCallback(() => {
        setAdminTheme(adminTheme === "dark" ? "light" : "dark");
    }, [adminTheme, setAdminTheme]);

    const resolvedAdminTheme = resolveTheme(adminTheme, systemIsDark);

    const value = useMemo(
        () => ({
            isMobileMenuOpen,
            setIsMobileMenuOpen,
            adminTheme,
            resolvedAdminTheme,
            setAdminTheme,
            toggleAdminTheme,
        }),
        [isMobileMenuOpen, adminTheme, resolvedAdminTheme, setAdminTheme, toggleAdminTheme]
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
