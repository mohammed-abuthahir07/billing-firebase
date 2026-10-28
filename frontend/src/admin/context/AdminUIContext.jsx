import { createContext, useContext, useState, useMemo } from "react";

const AdminUIContext = createContext();

export const AdminUIProvider = ({ children }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const value = useMemo(
        () => ({
            isMobileMenuOpen,
            setIsMobileMenuOpen
        }),
        [isMobileMenuOpen]
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
